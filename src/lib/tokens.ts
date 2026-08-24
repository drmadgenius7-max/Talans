import { randomBytes, createHash, timingSafeEqual, randomInt } from "node:crypto";

/**
 * Cryptographically secure, URL-safe token for public links (payment
 * requests, shared payments, group invites). 32 bytes -> 43 base64url chars
 * -> effectively unguessable, and never a raw database ID.
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** Session/reset tokens are hashed before being stored — the raw value only
 * ever exists client-side (cookie) or briefly in an email/SMS. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** 6-digit numeric OTP code for SMS/Email verification (mock provider). */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateIdempotencyKey(): string {
  return `idem_${generateSecureToken(16)}`;
}
