import "server-only";

/**
 * In-memory sliding-window rate limiter. Good enough for a single-instance
 * deployment; a multi-instance production deployment should swap this for
 * a shared store (Redis, Upstash, etc.) behind the same `checkRateLimit`
 * signature — callers don't need to change.
 */
const buckets = new Map<string, number[]>();

// Prevent unbounded memory growth from abandoned keys.
const MAX_TRACKED_KEYS = 50_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0]!;
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }

  timestamps.push(now);
  if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
  buckets.set(key, timestamps);
  return { allowed: true };
}

export async function getRequestIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";
}
