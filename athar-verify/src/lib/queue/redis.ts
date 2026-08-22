import type IORedisType from 'ioredis';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

const globalForRedis = globalThis as unknown as { atharRedis?: IORedisType | null };

/**
 * Shared Redis connection, or `null` when REDIS_URL is unset.
 *
 * A null connection is a supported mode, not an error: rate limiting falls back
 * to Postgres and jobs run inline. This keeps single-container deployments and
 * local development working with zero extra infrastructure.
 */
export function getRedis(): IORedisType | null {
  if (globalForRedis.atharRedis !== undefined) return globalForRedis.atharRedis;

  const url = env().REDIS_URL;
  if (!url) {
    globalForRedis.atharRedis = null;
    return null;
  }

  // Required by BullMQ, and sensible for our own usage too.
  const IORedis = require('ioredis') as typeof import('ioredis').default;
  const client = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  client.on('error', (err: Error) => logger.warn('redis_error', { err: err.message }));

  globalForRedis.atharRedis = client;
  return client;
}

export function redisEnabled(): boolean {
  return Boolean(env().REDIS_URL);
}
