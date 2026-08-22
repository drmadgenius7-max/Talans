import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareAudioFingerprints } from '../src/lib/media/audio';

/** Deterministic 16-bit hash sequence. */
function seq(count: number, seed: number): string[] {
  let x = seed;
  return Array.from({ length: count }, () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return ((x >> 7) & 0xffff).toString(16).padStart(4, '0');
  });
}

/** Flips `bitsPerFrame` bits, simulating a lossy audio re-encode. */
function degrade(hashes: string[], bitsPerFrame: number): string[] {
  return hashes.map((h, i) => {
    let v = parseInt(h, 16);
    for (let b = 0; b < bitsPerFrame; b += 1) v ^= 1 << ((i + b * 5) % 16);
    return (v & 0xffff).toString(16).padStart(4, '0');
  });
}

describe('audio fingerprint comparison', () => {
  it('scores an identical fingerprint at 1', () => {
    const a = seq(100, 7);
    assert.equal(compareAudioFingerprints(a, a), 1);
  });

  it('still recognises a lightly degraded re-encode', () => {
    const a = seq(100, 7);
    const score = compareAudioFingerprints(a, degrade(a, 2));
    assert.ok(score !== null && score > 0.5, `expected a clear match, got ${score}`);
  });

  it('reports null — not zero — for unrelated audio', () => {
    // A low number would read as contradiction; "no comparable evidence" is
    // the honest answer, and the verdict engine relies on this.
    assert.equal(compareAudioFingerprints(seq(100, 7), seq(100, 999)), null);
  });

  it('refuses to score fingerprints that are too short to be meaningful', () => {
    assert.equal(compareAudioFingerprints(seq(5, 7), seq(5, 7)), null);
    assert.equal(compareAudioFingerprints([], []), null);
  });

  it('aligns a trimmed excerpt against the full recording', () => {
    const full = seq(200, 11);
    const excerpt = full.slice(60, 140);
    const score = compareAudioFingerprints(full, excerpt);
    assert.equal(score, 1);
  });
});
