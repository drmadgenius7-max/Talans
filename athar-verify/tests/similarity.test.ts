import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareFrameSequences, durationDelta, SimilarityThresholds } from '../src/lib/analysis/similarity';
import type { FrameFingerprint } from '../src/lib/media/frames';

/**
 * Deterministic pseudo-random 64-bit hex hash (splitmix32).
 *
 * A plain LCG will not do here: its low bits are strongly correlated across
 * nearby seeds, which would make "unrelated" fixture frames land within the
 * pHash same-frame threshold and quietly invalidate the separation tests.
 */
function hash(seed: number): string {
  let state = (seed * 0x9e3779b9) >>> 0;
  const next = () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
  };
  return (
    next().toString(16).padStart(8, '0') + next().toString(16).padStart(8, '0')
  );
}

/** Flips `bits` low-order bits of a hash, simulating re-encoding drift. */
function perturb(hex: string, bits: number): string {
  const chars = hex.split('');
  for (let i = 0; i < bits; i += 1) {
    const idx = i % 16;
    chars[idx] = (parseInt(chars[idx], 16) ^ (1 << i % 4)).toString(16);
  }
  return chars.join('');
}

const sequence = (count: number, offset = 0): FrameFingerprint[] =>
  Array.from({ length: count }, (_, i) => ({ t: i, h: hash(i + offset), l: 120 }));

describe('video similarity', () => {
  it('scores an identical sequence at 100', () => {
    const frames = sequence(32);
    const report = compareFrameSequences(frames, frames);
    assert.equal(report.score, 100);
    assert.equal(report.matchedFrames, 32);
    assert.equal(report.bestOffsetSeconds, 0);
  });

  it('recognises a re-compressed copy as a content match', () => {
    const original = sequence(32);
    // Heavy but still-recognisable drift: every frame stays inside the pHash
    // same-frame threshold, which is exactly the WhatsApp re-encode case.
    const recompressed = original.map((f) => ({ ...f, h: perturb(f.h, 4) }));
    const report = compareFrameSequences(original, recompressed);
    assert.equal(report.matchedFrames, 32, 'every frame should still be recognisable');
    assert.ok(
      report.score >= SimilarityThresholds.CONTENT_MATCH,
      `a file whose every frame matched must not fall short of a content match (got ${report.score})`,
    );
  });

  it('rejects unrelated footage', () => {
    const report = compareFrameSequences(sequence(32), sequence(32, 5000));
    assert.ok(
      report.score < SimilarityThresholds.NO_MATCH,
      `expected no match, got ${report.score}`,
    );
    assert.equal(report.matchedFrames, 0);
  });

  it('finds a trimmed excerpt inside the original, aligning on time', () => {
    const original = sequence(32);
    // A real trimmed clip is re-sampled across its own shorter duration, so it
    // shares no frame indices with the original — only timestamps.
    const excerpt = original.slice(8, 26);
    const report = compareFrameSequences(original, excerpt);
    assert.ok(
      Math.abs(report.bestOffsetSeconds - 8) <= 1,
      `expected an offset near 8s, got ${report.bestOffsetSeconds}`,
    );
    assert.ok(
      report.score >= SimilarityThresholds.CONTENT_MATCH,
      `a genuine excerpt should be a content match, got ${report.score}`,
    );
  });

  it('recognises an excerpt that was re-sampled at a different frame rate', () => {
    // 32 frames spread over the middle 8 seconds of a 32-second original: the
    // sampling grids do not line up at all, which is what index-based
    // alignment could not handle.
    const original = sequence(32);
    const excerpt = Array.from({ length: 32 }, (_, i) => {
      const t = 8 + (i / 31) * 8;
      return { t, h: original[Math.round(t)].h, l: 120 };
    });
    const report = compareFrameSequences(original, excerpt);
    assert.ok(
      report.score >= SimilarityThresholds.CONTENT_MATCH,
      `re-sampled excerpt should still match, got ${report.score}`,
    );
  });

  it('shows why the candidate must be sampled on the original\'s time grid', () => {
    // The pipeline pins a candidate's sampling rate to the rate its original
    // was fingerprinted at. This test documents what that protects against: if
    // the two grids interleave instead of coinciding, frames that came from the
    // same footage land between each other in time and the score collapses.
    const original = sequence(32); // one sample per second
    const sameFootageSameGrid = sequence(32);
    const sameFootageDenserGrid = Array.from({ length: 64 }, (_, i) => ({
      t: i / 2,
      h: hash(Math.floor(i / 2) + 500),
      l: 120,
    }));

    const aligned = compareFrameSequences(original, sameFootageSameGrid);
    const misaligned = compareFrameSequences(original, sameFootageDenserGrid);

    assert.equal(aligned.score, 100);
    assert.ok(
      misaligned.score < aligned.score,
      'a mismatched sampling grid must not be mistaken for a perfect match',
    );
  });

  it('flags too-short input rather than guessing', () => {
    const report = compareFrameSequences(sequence(2), sequence(2));
    assert.equal(report.insufficientData, true);
    assert.equal(report.score, 0);
  });

  it('computes relative duration difference', () => {
    assert.equal(durationDelta(100, 100), 0);
    assert.equal(durationDelta(100, 90), 0.1);
    assert.equal(durationDelta(null, 90), null);
    assert.equal(durationDelta(0, 90), null);
  });
});
