import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/config/env';

/** Unambiguous alphabet — no 0/O/1/I — for tokens people may read aloud. */
const TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Cryptographically uniform pick from TOKEN_ALPHABET (no modulo bias). */
export function randomToken(length = 12): string {
  const alphabetLen = TOKEN_ALPHABET.length; // 32 → exact fit in 5 bits
  let out = '';
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (out.length >= length) break;
      const idx = byte % alphabetLen;
      // 256 % 32 === 0, so plain modulo is already unbiased here.
      out += TOKEN_ALPHABET[idx];
    }
  }
  return out;
}

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Constant-time string comparison that tolerates differing lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * One-way, salted digest of a client IP.
 *
 * We keep it so abuse can be rate-limited and audited, but the raw address is
 * never written to the database or the logs.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`${env().IP_HASH_SALT}:${ip}`).digest('hex').slice(0, 32);
}

/** ATH-7F3K9QD2 — the public, shareable verification id. */
export function generateVerificationId(): string {
  return `ATH-${randomToken(8)}`;
}

/** The secret half of the public link: /v/ATH-XXXXXXXX?t=<token>. */
export function generateLinkToken(): string {
  return randomToken(10);
}
