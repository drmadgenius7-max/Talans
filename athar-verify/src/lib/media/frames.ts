import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { runFfmpeg } from './ffmpeg';
import { hammingDistance, phashFromGray32 } from './phash';

const GRAY_SIZE = 32;
const BYTES_PER_FRAME = GRAY_SIZE * GRAY_SIZE;

export type FrameFingerprint = {
  /** Approximate timestamp in seconds. */
  t: number;
  /** 64-bit perceptual hash, hex. */
  h: string;
  /** Mean luma 0..255 — cheap signal for black frames and hard cuts. */
  l: number;
};

export type FrameExtractionResult = {
  frames: FrameFingerprint[];
  sampleFps: number;
  /** True when the video was too short/odd to sample the requested count. */
  degraded: boolean;
};

/**
 * Samples frames evenly across a video and fingerprints each one.
 *
 * Decoding goes straight to 32×32 grayscale raw video, so ffmpeg hands us
 * exactly the 1024 bytes per frame that pHash needs — no image decoding
 * library, no intermediate files, bounded memory.
 */
export async function extractFrameFingerprints(
  filePath: string,
  durationSeconds: number | null,
  sampleCount = env().FRAME_SAMPLE_COUNT,
  /**
   * Sampling rate to use instead of deriving one from the duration.
   *
   * When fingerprinting a candidate for comparison, the caller passes the rate
   * the *original* was sampled at. Both sides then sit on the same time grid,
   * so frames line up whatever the two durations are — and a trimmed copy
   * simply shows up as a shift along that shared grid. Without this, changing
   * FRAME_SAMPLE_COUNT would silently invalidate every already-processed
   * original, because the two grids would interleave instead of coincide.
   */
  fixedFps?: number | null,
): Promise<FrameExtractionResult> {
  const duration = durationSeconds && durationSeconds > 0 ? durationSeconds : null;

  // Aim for `sampleCount` frames spread over the whole clip. Clamped so a
  // 3-second clip does not ask for 10 fps and an hour-long one does not ask
  // for a rate ffmpeg rounds to zero.
  //
  // Sampling density is what decides whether a *trimmed* copy can be matched:
  // an excerpt is re-sampled across its own shorter duration, so the original
  // must be dense enough that every excerpt frame has a close neighbour in
  // time. Measured on a 6-second excerpt of a 12-second clip, 32 samples gave
  // 69% similarity while 64 gave 91% — with no change to how unrelated footage
  // scores.
  const rawFps = fixedFps && fixedFps > 0 ? fixedFps : duration ? sampleCount / duration : 1;
  const sampleFps = Math.min(8, Math.max(0.05, Number(rawFps.toFixed(4))));

  // A candidate sampled at the original's rate can legitimately produce more
  // frames than the original did (a longer recording), so the cap is generous.
  const maxFrames = Math.max(sampleCount * 3, 512);
  const { stdout } = await runFfmpeg(
    [
      '-v', 'error',
      '-i', filePath,
      '-an',
      '-sn',
      '-dn',
      '-vf', `fps=${sampleFps},scale=${GRAY_SIZE}:${GRAY_SIZE}:flags=area,format=gray`,
      '-frames:v', String(maxFrames),
      '-f', 'rawvideo',
      '-pix_fmt', 'gray',
      'pipe:1',
    ],
    { maxStdoutBytes: maxFrames * BYTES_PER_FRAME + 1024 },
  );

  const available = Math.floor(stdout.length / BYTES_PER_FRAME);
  const frames: FrameFingerprint[] = [];

  for (let i = 0; i < available; i += 1) {
    const slice = stdout.subarray(i * BYTES_PER_FRAME, (i + 1) * BYTES_PER_FRAME);
    let sum = 0;
    for (let p = 0; p < slice.length; p += 1) sum += slice[p];
    frames.push({
      t: Number((i / sampleFps).toFixed(2)),
      h: phashFromGray32(slice),
      l: Math.round(sum / slice.length),
    });
  }

  if (frames.length === 0) {
    logger.warn('frame_extraction_empty', { filePath: '[redacted]', sampleFps, duration });
  }

  return {
    frames,
    sampleFps,
    degraded: frames.length < Math.min(4, sampleCount),
  };
}

/** Generates a JPEG poster frame for the player, taken a little past the start. */
export async function generateThumbnail(
  filePath: string,
  durationSeconds: number | null,
): Promise<Buffer> {
  const seek = durationSeconds && durationSeconds > 3 ? Math.min(durationSeconds * 0.1, 5) : 0;
  const { stdout } = await runFfmpeg(
    [
      '-v', 'error',
      '-ss', seek.toFixed(2),
      '-i', filePath,
      '-frames:v', '1',
      '-vf', "scale='min(720,iw)':-2",
      '-q:v', '4',
      '-f', 'mjpeg',
      'pipe:1',
    ],
    { maxStdoutBytes: 8 * 1024 * 1024, timeoutMs: 45_000 },
  );
  return stdout;
}

/**
 * Frame-level integrity signals.
 *
 * These are *indicators only*. Duplicated frames are normal in screen
 * recordings, and hard cuts are normal in any edited documentation video —
 * neither is evidence of manipulation on its own.
 */
export type FrameSignals = {
  frameCount: number;
  /** Fraction of consecutive pairs that are near-identical. */
  duplicateFrameRatio: number;
  /** Count of consecutive pairs with a very large perceptual jump. */
  hardCutCount: number;
  /** Standard deviation of per-frame mean luma. */
  lumaStdDev: number;
  /** Frames that are essentially black. */
  blackFrameCount: number;
  /** Longest run of visually identical frames (frozen video). */
  longestStaticRun: number;
};

export function analyzeFrameSignals(frames: FrameFingerprint[]): FrameSignals {
  if (frames.length === 0) {
    return {
      frameCount: 0,
      duplicateFrameRatio: 0,
      hardCutCount: 0,
      lumaStdDev: 0,
      blackFrameCount: 0,
      longestStaticRun: 0,
    };
  }

  let duplicates = 0;
  let hardCuts = 0;
  let currentRun = 1;
  let longestRun = 1;

  for (let i = 1; i < frames.length; i += 1) {
    const distance = hammingDistance(frames[i - 1].h, frames[i].h);
    if (distance <= 2) {
      duplicates += 1;
      currentRun += 1;
      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 1;
    }
    if (distance >= 26) hardCuts += 1;
  }

  const lumas = frames.map((f) => f.l);
  const mean = lumas.reduce((a, b) => a + b, 0) / lumas.length;
  const variance = lumas.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lumas.length;

  return {
    frameCount: frames.length,
    duplicateFrameRatio: frames.length > 1 ? duplicates / (frames.length - 1) : 0,
    hardCutCount: hardCuts,
    lumaStdDev: Number(Math.sqrt(variance).toFixed(2)),
    blackFrameCount: lumas.filter((l) => l < 8).length,
    longestStaticRun: longestRun,
  };
}
