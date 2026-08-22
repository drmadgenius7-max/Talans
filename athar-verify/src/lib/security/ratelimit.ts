import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/config/env';
import { tooManyRequests } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getRedis } from '@/lib/queue/redis';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

/**
 * Fixed-window counter.
 *
 * Uses Redis when configured (atomic INCR + EXPIRE, works across instances);
 * otherwise falls back to a Postgres-backed bucket so limits still hold on a
 * multi-instance deployment without Redis. Both paths fail *open* on
 * infrastructure errors — a broken counter must not take down verification.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const bucketKey = `${env().QUEUE_PREFIX}:rl:${key}:${bucket}`;
  const resetAt = (bucket + 1) * windowSeconds * 1000;
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  const redis = getRedis();
  if (redis) {
    try {
      const count = await redis.incr(bucketKey);
      if (count === 1) await redis.expire(bucketKey, windowSeconds + 1);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        limit,
        retryAfter,
      };
    } catch (err) {
      logger.warn('ratelimit_redis_failed', { err, key });
      // fall through to the database path
    }
  }

  try {
    const expiresAt = new Date(resetAt);
    const row = await prisma.rateLimitBucket.upsert({
      where: { key: bucketKey },
      create: { key: bucketKey, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });
    // Opportunistic garbage collection (~2% of calls).
    if (Math.random() < 0.02) {
      void prisma.rateLimitBucket
        .deleteMany({ where: { expiresAt: { lt: new Date() } } })
        .catch(() => undefined);
    }
    return {
      allowed: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      limit,
      retryAfter,
    };
  } catch (err) {
    logger.error('ratelimit_db_failed', { err, key });
    return { allowed: true, remaining: limit, limit, retryAfter };
  }
}

/** Throws a 429 AppError when the limit is exceeded. */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  message?: string,
): Promise<RateLimitResult> {
  const result = await rateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    throw tooManyRequests(
      message ?? `عدد المحاولات كبير. حاول مجددًا بعد ${result.retryAfter} ثانية.`,
      result.retryAfter,
    );
  }
  return result;
}

/** Named policies, so limits live in one place. */
export const RateLimits = {
  lookup: (ipHash: string) => ({
    key: `lookup:${ipHash}`,
    limit: env().RATE_LIMIT_LOOKUP_PER_MINUTE,
    window: 60,
    message: 'عدد محاولات البحث كبير. انتظر دقيقة ثم حاول مرة أخرى.',
  }),
  /** Second, slower layer that blunts order-number enumeration. */
  lookupDaily: (ipHash: string) => ({
    key: `lookup-day:${ipHash}`,
    limit: env().RATE_LIMIT_LOOKUP_PER_MINUTE * 40,
    window: 60 * 60 * 24,
    message: 'تم تجاوز الحد اليومي لمحاولات البحث.',
  }),
  upload: (ipHash: string) => ({
    key: `upload:${ipHash}`,
    limit: env().RATE_LIMIT_UPLOAD_PER_HOUR,
    window: 3600,
    message: 'تم تجاوز عدد عمليات رفع الملفات المسموح بها هذه الساعة.',
  }),
  login: (ipHash: string) => ({
    key: `login:${ipHash}`,
    limit: env().RATE_LIMIT_LOGIN_PER_15MIN,
    window: 900,
    message: 'محاولات تسجيل دخول كثيرة. حاول بعد 15 دقيقة.',
  }),
  publicView: (ipHash: string) => ({
    key: `view:${ipHash}`,
    limit: 60,
    window: 60,
    message: 'عدد الطلبات كبير. حاول بعد قليل.',
  }),
} as const;

export async function enforcePolicy(policy: {
  key: string;
  limit: number;
  window: number;
  message: string;
}) {
  return enforceRateLimit(policy.key, policy.limit, policy.window, policy.message);
}
