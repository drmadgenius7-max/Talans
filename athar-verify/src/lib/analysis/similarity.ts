import type { FrameFingerprint } from '@/lib/media/frames';
import { PHASH_BITS, SAME_FRAME_MAX_DISTANCE, hammingDistance } from '@/lib/media/phash';

/**
 * Video content similarity.
 *
 * The question this answers is *not* "are these the same bytes" — SHA-256
 * already answered that. It is "is this the same footage", which is what a
 * customer actually has after WhatsApp re-encoded the file they were sent.
 *
 * Two complementary measures are computed:
 *
 *  - **Sequence similarity** aligns the two frame sequences by sliding one over
 *    the other and taking the best offset. High scores mean the same footage in
 *    the same order, including a trimmed copy.
 *  - **Coverage** asks, for each candidate frame, whether *some* original frame
 *    matches it. Order-insensitive, so it still recognises a re-ordered or
 *    partially reused clip that sequence alignment would miss.
 *
 * They are reported separately as well as combined, because the difference
 * between them is itself informative: high coverage with low sequence score is
 * the signature of a re-cut edit rather than a re-compression.
 */

export type SimilarityReport = {
  /** 0..100 — headline number shown to the customer. */
  score: number;
  /** 0..100 — best sliding-window alignment. */
  sequenceScore: number;
  /** 0..100 — fraction of candidate frames found somewhere in the original. */
  coverageScore: number;
  /** Where the candidate starts inside the original, in seconds. */
  bestOffsetSeconds: number;
  /** Frames compared in the winning alignment. */
  alignedFrames: number;
  /** Candidate frames with a confident match in the original. */
  matchedFrames: number;
  candidateFrameCount: number;
  originalFrameCount: number;
  /** True when there were too few frames on either side to judge. */
  insufficientData: boolean;
};

const EMPTY: SimilarityReport = {
  score: 0,
  sequenceScore: 0,
  coverageScore: 0,
  bestOffsetSeconds: 0,
  alignedFrames: 0,
  matchedFrames: 0,
  candidateFrameCount: 0,
  originalFrameCount: 0,
  insufficientData: true,
};

function pairScore(a: string, b: string): number {
  return 1 - hammingDistance(a, b) / PHASH_BITS;
}

/**
 * Rescales raw pHash agreement into a meaningful 0..1 range.
 *
 * Two unrelated 64-bit hashes already agree on ~50% of bits, so a raw 0.5 means
 * "nothing in common". Anything at or below that floor maps to 0.
 */
function rescale(raw: number): number {
  return Math.max(0, (raw - 0.5) * 2);
}

export function compareFrameSequences(
  original: FrameFingerprint[],
  candidate: FrameFingerprint[],
): SimilarityReport {
  if (original.length < 3 || candidate.length < 3) {
    return { ...EMPTY, candidateFrameCount: candidate.length, originalFrameCount: original.length };
  }

  const originalHashes = original.map((f) => f.h);
  const candidateHashes = candidate.map((f) => f.h);

  // --- Sequence alignment, in the time domain -------------------------------
  //
  // Index alignment is not enough. Frames are sampled to a fixed count across
  // whatever the clip's duration happens to be, so a 6-second excerpt of a
  // 12-second original is sampled twice as densely — frame 10 of one is nowhere
  // near frame 10 of the other, and an index-wise comparison of a perfectly
  // genuine excerpt scores as a near-miss. Aligning on the recorded timestamps
  // instead makes a trimmed copy line up the way a viewer would see it, which
  // is exactly the "قص جزءًا منه" case the system is expected to handle.
  const originalTimes = original.map((f) => f.t);
  const candidateSpan = candidate[candidate.length - 1].t - candidate[0].t;
  const originalSpan = originalTimes[originalTimes.length - 1] - originalTimes[0];

  /** Index of the original frame nearest a given timestamp. */
  const nearestOriginal = (time: number): number => {
    let lo = 0;
    let hi = originalTimes.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (originalTimes[mid] < time) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(originalTimes[lo - 1] - time) <= Math.abs(originalTimes[lo] - time)) {
      return lo - 1;
    }
    return lo;
  };

  const maxShift = Math.max(0, originalSpan - candidateSpan);
  const SHIFT_STEPS = 60;
  const shiftStep = maxShift > 0 ? maxShift / SHIFT_STEPS : 0;

  let bestRaw = 0;
  let bestOffsetSeconds = 0;

  for (let step = 0; step <= (shiftStep > 0 ? SHIFT_STEPS : 0); step += 1) {
    const shift = shiftStep * step;
    let total = 0;
    for (let i = 0; i < candidate.length; i += 1) {
      const target = candidate[i].t - candidate[0].t + originalTimes[0] + shift;
      total += pairScore(originalHashes[nearestOriginal(target)], candidateHashes[i]);
    }
    const raw = total / candidate.length;
    if (raw > bestRaw) {
      bestRaw = raw;
      bestOffsetSeconds = shift;
    }
  }

  // --- Coverage -------------------------------------------------------------
  let matchedFrames = 0;
  let coverageTotal = 0;
  for (const hash of candidateHashes) {
    let bestPair = 0;
    let bestDistance = PHASH_BITS;
    for (const originalHash of originalHashes) {
      const distance = hammingDistance(hash, originalHash);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPair = 1 - distance / PHASH_BITS;
        if (distance === 0) break;
      }
    }
    coverageTotal += bestPair;
    if (bestDistance <= SAME_FRAME_MAX_DISTANCE) matchedFrames += 1;
  }

  const sequenceScore = rescale(bestRaw) * 100;
  const coverageScore = rescale(coverageTotal / candidateHashes.length) * 100;

  // Fraction of candidate frames that clear the pHash "same frame" threshold.
  //
  // This is the most robust of the three measures and the one we actually show
  // the customer ("تطابق 32 من 32 إطارًا"). It matters because the two
  // bit-agreement scores above are averages: a heavy re-compression that leaves
  // every single frame recognisable can still average down near the threshold,
  // and reporting "تعذر التأكد" for a file whose every frame matched would be
  // wrong. It is discounted slightly because it is a coarser, pass/fail measure.
  const matchRatioScore = (matchedFrames / candidateHashes.length) * 100 * 0.95;

  // Coverage is discounted too: matching frames out of order is weaker
  // evidence than matching them in order.
  const score = Math.max(sequenceScore, coverageScore * 0.92, matchRatioScore);

  const round = (n: number) => Number(Math.min(100, Math.max(0, n)).toFixed(2));

  return {
    score: round(score),
    sequenceScore: round(sequenceScore),
    coverageScore: round(coverageScore),
    bestOffsetSeconds: Number(bestOffsetSeconds.toFixed(2)),
    alignedFrames: candidateHashes.length,
    matchedFrames,
    candidateFrameCount: candidateHashes.length,
    originalFrameCount: originalHashes.length,
    insufficientData: false,
  };
}

/** Relative duration difference, 0 = identical length. */
export function durationDelta(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  return Number((Math.abs(a - b) / Math.max(a, b)).toFixed(4));
}

/**
 * Similarity thresholds.
 *
 * Tuned so that ordinary messenger re-compression lands in CONTENT_MATCH while
 * genuinely different footage lands in NO_MATCH, with a deliberately wide
 * uncertain band in between that resolves to "تعذر التأكد" rather than an
 * accusation.
 */
export const SimilarityThresholds = {
  /** At or above this, the content is the same recording. */
  CONTENT_MATCH: 88,
  /**
   * Above this the picture evidence stands on its own: no secondary signal
   * (audio, metadata, AI) is allowed to pull the verdict back from a match.
   */
  STRONG_CONTENT_MATCH: 92,
  /** Below this, the content is unrelated to the registered documentation. */
  NO_MATCH: 55,
} as const;
