import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  frameSimilarity,
  hammingDistance,
  isSameFrame,
  phashFromGray32,
} from '../src/lib/media/phash';

/** Builds a 32×32 grayscale frame by point-sampling a pixel function. */
function frame(fn: (x: number, y: number) => number): Uint8Array {
  const out = new Uint8Array(32 * 32);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      out[y * 32 + x] = Math.max(0, Math.min(255, Math.round(fn(x, y))));
    }
  }
  return out;
}

/**
 * A broadband, photo-like scene: two dozen sinusoids at varied frequencies and
 * phases, so every coefficient in the hashed 8×8 DCT block carries real
 * magnitude.
 *
 * This matters. A single sinusoid, a ramp, or a flat field is spectrally sparse
 * — most of the hashed block sits at or near zero, where the median comparison
 * is decided by rounding rather than by picture content. Such frames are a
 * degenerate input for *any* median-threshold perceptual hash and say nothing
 * about behaviour on real footage, which is always broadband.
 */
const sceneFn = (() => {
  let state = 12345;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const components = Array.from({ length: 24 }, (_, i) => ({
    fx: rnd() * 6 + 0.3,
    fy: rnd() * 6 + 0.3,
    phase: rnd() * Math.PI * 2,
    amplitude: 30 / (i * 0.35 + 1),
  }));

  return (x: number, y: number) =>
    128 +
    components.reduce(
      (acc, c) =>
        acc +
        c.amplitude * Math.sin((x / 32) * Math.PI * c.fx + (y / 32) * Math.PI * c.fy + c.phase),
      0,
    );
})();

const otherSceneFn = (x: number, y: number) =>
  128 +
  70 * Math.cos((x / 32) * Math.PI * 3.7) -
  45 * Math.sin((y / 32) * Math.PI * 1.3) +
  35 * Math.sin((x / 32) * Math.PI * 5.1 + (y / 32) * Math.PI * 2.9);

const scene = frame(sceneFn);
const otherScene = frame(otherSceneFn);
const circle = frame((x, y) => (Math.hypot(x - 16, y - 16) < 10 ? 210 : 40));

/**
 * Renders `fn` at `factor`× resolution with uniform ±`amplitude` noise, then
 * box-averages back down to 32×32 — the same order of operations as
 * `ffmpeg -vf scale=32:32:flags=area` applied to a compressed frame. Injecting
 * noise directly at 32×32 would be far harsher than any real re-encode, since
 * the downscale averages roughly 200 source pixels into each output pixel.
 */
function downscaleWithNoise(
  fn: (x: number, y: number) => number,
  factor: number,
  amplitude: number,
  seed = 42,
): Uint8Array {
  let state = seed;
  const out = new Uint8Array(32 * 32);
  for (let y = 0; y < 32; y += 1) {
    for (let x = 0; x < 32; x += 1) {
      let sum = 0;
      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          state = (state * 1103515245 + 12345) & 0x7fffffff;
          const noise = amplitude === 0 ? 0 : ((state >>> 16) % (amplitude * 2 + 1)) - amplitude;
          sum += Math.max(0, Math.min(255, fn(x + sx / factor, y + sy / factor) + noise));
        }
      }
      out[y * 32 + x] = Math.round(sum / (factor * factor));
    }
  }
  return out;
}

describe('pHash', () => {
  it('produces a stable 16-character hex hash', () => {
    const hash = phashFromGray32(scene);
    assert.match(hash, /^[0-9a-f]{16}$/);
    assert.equal(phashFromGray32(scene), hash, 'must be deterministic');
  });

  it('is unchanged by a uniform brightness shift', () => {
    // Re-encoding routinely shifts overall levels. The DC term is dropped
    // precisely so this does not move the hash. The shift stays inside 0..255
    // for every pixel — clamping would be a genuine change to the picture.
    const brighter = frame((x, y) => sceneFn(x, y) + 15);
    assert.equal(phashFromGray32(scene), phashFromGray32(brighter));
  });

  it('survives the additive noise that lossy compression introduces', () => {
    const clean = downscaleWithNoise(sceneFn, 8, 0);
    for (const amplitude of [8, 16, 24]) {
      const noisy = downscaleWithNoise(sceneFn, 8, amplitude, 99);
      const distance = hammingDistance(phashFromGray32(clean), phashFromGray32(noisy));
      assert.ok(
        isSameFrame(phashFromGray32(clean), phashFromGray32(noisy)),
        `±${amplitude} compression noise must still register as the same frame (distance ${distance})`,
      );
    }
  });

  it('separates genuinely different images', () => {
    const distance = hammingDistance(phashFromGray32(scene), phashFromGray32(otherScene));
    assert.ok(distance > 10, `expected clear separation, got hamming distance ${distance}`);
    assert.ok(!isSameFrame(phashFromGray32(scene), phashFromGray32(otherScene)));
  });

  it('is deterministic even on degenerate, near-flat frames', () => {
    // Most of the hashed block is mathematically zero here; without the
    // near-zero snapping this is where floating-point noise would flip bits.
    const flatRamp = frame((x, y) => x * 4 + y * 2);
    const flatRampBrighter = frame((x, y) => x * 4 + y * 2 + 30);
    assert.equal(phashFromGray32(flatRamp), phashFromGray32(flatRamp));
    assert.equal(phashFromGray32(flatRamp), phashFromGray32(flatRampBrighter));
  });

  it('reports 1.0 similarity for an identical frame', () => {
    assert.equal(frameSimilarity(phashFromGray32(circle), phashFromGray32(circle)), 1);
  });

  it('treats malformed input defensively', () => {
    assert.equal(hammingDistance('abc', 'abcdef0123456789'), 64);
    assert.equal(hammingDistance('zzzzzzzzzzzzzzzz', '0000000000000000'), 64);
    assert.throws(() => phashFromGray32(new Uint8Array(10)));
  });
});
