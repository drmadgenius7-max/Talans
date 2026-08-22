/**
 * Perceptual hashing (pHash) — DCT-II based, 64-bit.
 *
 * This is what lets us recognise a video that WhatsApp re-encoded, Telegram
 * re-compressed, or a phone gallery re-saved: the bytes change (so SHA-256
 * changes) but the *picture* does not, and a perceptual hash tracks the picture.
 *
 * Pipeline per frame: 32×32 grayscale → DCT-II → keep the 8×8 low-frequency
 * block (dropping the DC term) → 1 bit per coefficient against the median.
 */

const SIZE = 32;
const HASH_SIDE = 8;
export const PHASH_BITS = HASH_SIDE * HASH_SIDE; // 64

/** Precomputed DCT-II basis: cosTable[u][x] = cos((2x+1)·u·π / 2N). */
const cosTable: number[][] = (() => {
  const table: number[][] = [];
  for (let u = 0; u < SIZE; u += 1) {
    const row = new Array<number>(SIZE);
    for (let x = 0; x < SIZE; x += 1) {
      row[x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE));
    }
    table.push(row);
  }
  return table;
})();

const SQRT1_2 = Math.SQRT1_2;

/**
 * Separable 2-D DCT-II of a 32×32 grayscale block.
 *
 * Done as rows-then-columns (O(2·N³)) rather than the naive O(N⁴); at N=32 with
 * a cached cosine table this is ~65k multiplies per frame, which is negligible
 * next to decoding the frame in the first place.
 */
function dct2d(input: Float64Array): Float64Array {
  const rows = new Float64Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const base = y * SIZE;
    for (let u = 0; u < SIZE; u += 1) {
      const cos = cosTable[u];
      let sum = 0;
      for (let x = 0; x < SIZE; x += 1) sum += input[base + x] * cos[x];
      rows[base + u] = sum * (u === 0 ? SQRT1_2 : 1);
    }
  }

  const out = new Float64Array(SIZE * SIZE);
  for (let x = 0; x < SIZE; x += 1) {
    for (let v = 0; v < SIZE; v += 1) {
      const cos = cosTable[v];
      let sum = 0;
      for (let y = 0; y < SIZE; y += 1) sum += rows[y * SIZE + x] * cos[y];
      out[v * SIZE + x] = sum * (v === 0 ? SQRT1_2 : 1);
    }
  }
  return out;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Computes the 64-bit pHash of one 32×32 grayscale frame.
 *
 * @param gray 1024 bytes, row-major, one byte per pixel.
 * @returns 16 lowercase hex characters.
 */
export function phashFromGray32(gray: Uint8Array | Buffer): string {
  if (gray.length < SIZE * SIZE) {
    throw new Error(`إطار غير مكتمل: ${gray.length} بايت بدل ${SIZE * SIZE}.`);
  }

  const input = new Float64Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i += 1) input[i] = gray[i];

  const dct = dct2d(input);

  // Low-frequency 8×8 block, skipping the DC term (index 0), which only
  // encodes overall brightness — exactly the thing re-encoding shifts.
  const coefficients: number[] = [];
  for (let v = 0; v < HASH_SIDE; v += 1) {
    for (let u = 0; u < HASH_SIDE; u += 1) {
      if (u === 0 && v === 0) continue;
      coefficients.push(dct[v * SIZE + u]);
    }
  }

  // Snap numerically-zero coefficients to exactly zero before comparing.
  //
  // Flat or highly regular content (a plain wall, a ramp, a solid colour card)
  // leaves most of the low-frequency block mathematically at zero, where the
  // floating-point result is ±1e-12 of arbitrary sign. Comparing that noise
  // against a near-zero median would make those bits flip between runs on
  // pixel-identical input. Snapping makes the hash deterministic for such
  // frames and is a no-op for real footage, where these coefficients carry
  // real magnitude.
  const maxAbs = coefficients.reduce((acc, c) => Math.max(acc, Math.abs(c)), 0);
  const epsilon = maxAbs * 1e-9;
  const cleaned = coefficients.map((c) => (Math.abs(c) <= epsilon ? 0 : c));

  const med = median(cleaned);

  // 63 comparison bits + a padding bit keeps the value a clean 64-bit hex word.
  let hex = '';
  let nibble = 0;
  let bitsInNibble = 0;
  const bits = [...cleaned.map((c) => (c > med ? 1 : 0)), 0];

  for (const bit of bits) {
    nibble = (nibble << 1) | bit;
    bitsInNibble += 1;
    if (bitsInNibble === 4) {
      hex += nibble.toString(16);
      nibble = 0;
      bitsInNibble = 0;
    }
  }

  return hex;
}

const POPCOUNT = new Uint8Array(256);
for (let i = 0; i < 256; i += 1) {
  POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1];
}

/** Number of differing bits between two hex pHashes. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return PHASH_BITS;
  let distance = 0;
  for (let i = 0; i < a.length; i += 2) {
    const byteA = parseInt(a.slice(i, i + 2), 16);
    const byteB = parseInt(b.slice(i, i + 2), 16);
    if (Number.isNaN(byteA) || Number.isNaN(byteB)) return PHASH_BITS;
    distance += POPCOUNT[(byteA ^ byteB) & 0xff];
  }
  return distance;
}

/** 1.0 = identical picture, 0.0 = completely unrelated. */
export function frameSimilarity(a: string, b: string): number {
  return 1 - hammingDistance(a, b) / PHASH_BITS;
}

/**
 * A frame counts as "the same shot" below this many differing bits.
 *
 * 10/64 is the commonly used threshold for pHash: it comfortably absorbs
 * re-encoding, resolution changes, and moderate cropping while still rejecting
 * unrelated footage.
 */
export const SAME_FRAME_MAX_DISTANCE = 10;

export function isSameFrame(a: string, b: string): boolean {
  return hammingDistance(a, b) <= SAME_FRAME_MAX_DISTANCE;
}
