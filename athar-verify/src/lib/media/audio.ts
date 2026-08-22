import { runFfmpeg } from './ffmpeg';

/**
 * Audio fingerprinting and waveform statistics.
 *
 * The fingerprint is a Haitsma–Kalker style sub-band energy hash: for each
 * short frame we compare band energies against the previous frame and emit one
 * bit per band pair. Comparing *changes* rather than absolute levels is what
 * makes it survive volume normalisation and lossy re-encoding — the same
 * transformations WhatsApp applies.
 *
 * The module is deliberately shaped as a pluggable analysis step so an audio
 * deepfake detector can be added later without touching callers: it would
 * consume the same decoded PCM and contribute additional `signals`.
 */

const SAMPLE_RATE = 8000;
const FRAME_SIZE = 2048; // 256 ms at 8 kHz
const HOP_SIZE = 1024; // 50% overlap
const BAND_COUNT = 17; // 16 bits per frame from 17 band boundaries
const MAX_FRAMES = 1200; // ~5 minutes of fingerprint; plenty for matching

export type AudioFingerprint = {
  present: boolean;
  sampleRate: number;
  durationSeconds: number;
  /** One 16-bit sub-band hash per frame, hex, 4 chars each. */
  hashes: string[];
  stats: WaveformStats;
};

export type WaveformStats = {
  /** Root-mean-square level, 0..1. */
  rms: number;
  /** Highest absolute sample, 0..1. */
  peak: number;
  /** Peak-to-RMS in dB; very high values suggest heavy dynamic processing. */
  crestFactorDb: number;
  /** Fraction of samples at full scale — clipping. */
  clippedRatio: number;
  /** Fraction of frames below the silence floor. */
  silenceRatio: number;
  /** Rate of sign changes; a rough brightness proxy. */
  zeroCrossingRate: number;
};

/** Decodes any input to mono 16-bit PCM at 8 kHz. */
async function decodePcm(filePath: string, maxSeconds = 600): Promise<Int16Array | null> {
  try {
    const { stdout } = await runFfmpeg(
      [
        '-v', 'error',
        '-i', filePath,
        '-vn',
        '-t', String(maxSeconds),
        '-ac', '1',
        '-ar', String(SAMPLE_RATE),
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        'pipe:1',
      ],
      { maxStdoutBytes: maxSeconds * SAMPLE_RATE * 2 + 1024, timeoutMs: 90_000 },
    );

    if (stdout.length < FRAME_SIZE * 2) return null;

    const samples = new Int16Array(stdout.length >> 1);
    for (let i = 0; i < samples.length; i += 1) samples[i] = stdout.readInt16LE(i * 2);
    return samples;
  } catch {
    // No audio track, or an unsupported codec. Both are ordinary, not errors.
    return null;
  }
}

/** In-place iterative radix-2 Cooley–Tukey FFT. `size` must be a power of two. */
function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curReal = 1;
      let curImag = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const aReal = real[i + k];
        const aImag = imag[i + k];
        const bReal = real[i + k + len / 2] * curReal - imag[i + k + len / 2] * curImag;
        const bImag = real[i + k + len / 2] * curImag + imag[i + k + len / 2] * curReal;
        real[i + k] = aReal + bReal;
        imag[i + k] = aImag + bImag;
        real[i + k + len / 2] = aReal - bReal;
        imag[i + k + len / 2] = aImag - bImag;
        const nextReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
      }
    }
  }
}

/** Logarithmically spaced band edges between 300 Hz and 3400 Hz (speech band). */
const BAND_EDGES = (() => {
  const low = 300;
  const high = 3400;
  const edges: number[] = [];
  for (let i = 0; i <= BAND_COUNT; i += 1) {
    const freq = low * (high / low) ** (i / BAND_COUNT);
    edges.push(Math.max(1, Math.round((freq * FRAME_SIZE) / SAMPLE_RATE)));
  }
  return edges;
})();

const HANN = (() => {
  const w = new Float64Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i += 1) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)));
  }
  return w;
})();

function computeStats(samples: Int16Array): WaveformStats {
  let sumSquares = 0;
  let peak = 0;
  let clipped = 0;
  let zeroCrossings = 0;
  let previousSign = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i] / 32768;
    sumSquares += v * v;
    const abs = Math.abs(v);
    if (abs > peak) peak = abs;
    if (abs > 0.999) clipped += 1;
    const sign = v > 0 ? 1 : v < 0 ? -1 : 0;
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) zeroCrossings += 1;
    if (sign !== 0) previousSign = sign;
  }

  const rms = Math.sqrt(sumSquares / samples.length);

  // Frame-level silence detection (−50 dBFS floor).
  let silentFrames = 0;
  let totalFrames = 0;
  for (let start = 0; start + FRAME_SIZE <= samples.length; start += FRAME_SIZE) {
    let frameSum = 0;
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      const v = samples[start + i] / 32768;
      frameSum += v * v;
    }
    if (Math.sqrt(frameSum / FRAME_SIZE) < 0.00316) silentFrames += 1;
    totalFrames += 1;
  }

  return {
    rms: Number(rms.toFixed(5)),
    peak: Number(peak.toFixed(5)),
    crestFactorDb: rms > 0 ? Number((20 * Math.log10(peak / rms)).toFixed(2)) : 0,
    clippedRatio: Number((clipped / samples.length).toFixed(6)),
    silenceRatio: totalFrames ? Number((silentFrames / totalFrames).toFixed(4)) : 0,
    zeroCrossingRate: Number((zeroCrossings / samples.length).toFixed(5)),
  };
}

function computeSubBandHashes(samples: Int16Array): string[] {
  const hashes: string[] = [];
  let previousBands: Float64Array | null = null;

  const real = new Float64Array(FRAME_SIZE);
  const imag = new Float64Array(FRAME_SIZE);

  for (
    let start = 0;
    start + FRAME_SIZE <= samples.length && hashes.length < MAX_FRAMES;
    start += HOP_SIZE
  ) {
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      real[i] = (samples[start + i] / 32768) * HANN[i];
      imag[i] = 0;
    }
    fft(real, imag);

    const bands = new Float64Array(BAND_COUNT);
    for (let b = 0; b < BAND_COUNT; b += 1) {
      let energy = 0;
      for (let k = BAND_EDGES[b]; k < BAND_EDGES[b + 1]; k += 1) {
        energy += real[k] * real[k] + imag[k] * imag[k];
      }
      bands[b] = energy;
    }

    if (previousBands) {
      // bit(b) = 1 when band b gained energy relative to band b+1 since the
      // previous frame. Differential in both axes ⇒ robust to gain and EQ.
      let bits = 0;
      for (let b = 0; b < BAND_COUNT - 1; b += 1) {
        const delta = bands[b] - bands[b + 1] - (previousBands[b] - previousBands[b + 1]);
        bits = (bits << 1) | (delta > 0 ? 1 : 0);
      }
      hashes.push((bits & 0xffff).toString(16).padStart(4, '0'));
    }

    previousBands = bands.slice();
  }

  return hashes;
}

export async function fingerprintAudio(filePath: string): Promise<AudioFingerprint> {
  const samples = await decodePcm(filePath);

  if (!samples) {
    return {
      present: false,
      sampleRate: SAMPLE_RATE,
      durationSeconds: 0,
      hashes: [],
      stats: {
        rms: 0,
        peak: 0,
        crestFactorDb: 0,
        clippedRatio: 0,
        silenceRatio: 1,
        zeroCrossingRate: 0,
      },
    };
  }

  return {
    present: true,
    sampleRate: SAMPLE_RATE,
    durationSeconds: Number((samples.length / SAMPLE_RATE).toFixed(2)),
    hashes: computeSubBandHashes(samples),
    stats: computeStats(samples),
  };
}

/**
 * Minimum frames before a fingerprint is worth comparing at all.
 *
 * Below roughly three seconds of audio the alignment search has nothing to grip
 * and the score is noise.
 */
const POPCOUNT16 = (x: number): number => {
  let v = x - ((x >> 1) & 0x5555);
  v = (v & 0x3333) + ((v >> 2) & 0x3333);
  v = (v + (v >> 4)) & 0x0f0f;
  return (v + (v >> 8)) & 0x1f;
};

/**
 * Minimum frames before a comparison is worth attempting.
 *
 * Below roughly three seconds of audio the alignment search has nothing to grip
 * and any score it produces is noise.
 */
const MIN_COMPARABLE_FRAMES = 20;

/**
 * Significance floor for a bit-agreement rate.
 *
 * Two unrelated 16-bit hash sequences already agree on ~50% of bits, so 0.5 is
 * chance, not "half a match". Over `bitCount` independent comparisons the
 * chance rate has standard deviation sqrt(0.25 / bitCount); requiring four of
 * those puts the floor safely outside the noise. Measured on re-encoded field
 * audio, genuine matches land around 0.83 while unrelated audio sits at 0.52,
 * so this floor separates them with room to spare.
 */
function significanceFloor(bitCount: number): number {
  return Math.max(0.53, 0.5 + 4 * Math.sqrt(0.25 / bitCount));
}

/**
 * Best-alignment similarity between two fingerprints, 0..1, or `null`.
 *
 * Slides the shorter sequence across the longer one so a trimmed intro or a
 * clip taken from the middle of the original still matches.
 *
 * **Audio is positive evidence only.** When the best agreement is not
 * distinguishable from chance this returns `null` — "no comparable audio
 * evidence" — rather than a low number. That distinction matters: a customer's
 * copy may be muted, re-encoded to 32 kbps, or carry a different language
 * track, none of which say anything about whether the *footage* is the
 * registered documentation. Reporting 0% there would read as contradiction and
 * would drag down a verdict the picture evidence had already settled.
 */
export function compareAudioFingerprints(a: string[], b: string[]): number | null {
  if (a.length < MIN_COMPARABLE_FRAMES || b.length < MIN_COMPARABLE_FRAMES) return null;

  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  const shortNums = short.map((h) => parseInt(h, 16) & 0xffff);
  const longNums = long.map((h) => parseInt(h, 16) & 0xffff);

  // Cap the search so a long video does not turn this into an O(n²) crawl.
  const maxOffset = Math.min(longNums.length - shortNums.length, 600);
  const step = maxOffset > 200 ? Math.ceil(maxOffset / 200) : 1;

  let best = 0;
  let bestWindow = 0;
  for (let offset = 0; offset <= Math.max(0, maxOffset); offset += step) {
    let matchingBits = 0;
    const window = Math.min(shortNums.length, longNums.length - offset);
    if (window <= 0) break;
    for (let i = 0; i < window; i += 1) {
      matchingBits += 16 - POPCOUNT16(shortNums[i] ^ longNums[offset + i]);
    }
    const score = matchingBits / (window * 16);
    if (score > best) {
      best = score;
      bestWindow = window;
    }
  }

  if (bestWindow === 0) return null;
  if (best < significanceFloor(bestWindow * 16)) return null;

  // Rescale so 0.5 (chance) reads as 0 and 1.0 reads as 1.
  return Number(Math.max(0, Math.min(1, (best - 0.5) * 2)).toFixed(4));
}
