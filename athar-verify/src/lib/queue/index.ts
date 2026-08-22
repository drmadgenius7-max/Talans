import type { Queue } from 'bullmq';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { getRedis, redisEnabled } from './redis';
import { JobName, QUEUE_NAME, type JobPayloads } from './jobs';

export { JobName, QUEUE_NAME } from './jobs';
export type { JobPayloads } from './jobs';

const globalForQueue = globalThis as unknown as { atharQueue?: Queue | null };

/** The BullMQ queue, or null when running without Redis. */
export function mediaQueue(): Queue | null {
  if (globalForQueue.atharQueue !== undefined) return globalForQueue.atharQueue;

  if (!redisEnabled()) {
    globalForQueue.atharQueue = null;
    return null;
  }

  const connection = getRedis();
  if (!connection) {
    globalForQueue.atharQueue = null;
    return null;
  }

  const { Queue: BullQueue } = require('bullmq') as typeof import('bullmq');
  const queue = new BullQueue(QUEUE_NAME, {
    connection,
    prefix: env().QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 24 * 3600, count: 500 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });

  globalForQueue.atharQueue = queue;
  return queue;
}

/**
 * Enqueues a media job.
 *
 * With Redis configured the job is handed to the worker process. Without it,
 * the job runs inline in the background of the current process — the same code
 * path, just without durability. That keeps `docker compose up` with a single
 * container a fully working deployment, and keeps local development free of
 * extra infrastructure.
 */
export async function enqueue<K extends JobName>(name: K, data: JobPayloads[K]): Promise<{ mode: 'queued' | 'inline' }> {
  const queue = mediaQueue();

  if (queue) {
    await queue.add(name, data, { jobId: buildJobId(name, data) });
    logger.info('job_enqueued', { name, ...data });
    return { mode: 'queued' };
  }

  // Fire-and-forget: the HTTP response must not wait for video processing.
  void runInline(name, data);
  return { mode: 'inline' };
}

/** Deduplicates repeat enqueues for the same entity while one is pending. */
function buildJobId<K extends JobName>(name: K, data: JobPayloads[K]): string {
  const id =
    'documentationId' in data ? data.documentationId : 'checkId' in data ? data.checkId : 'unknown';
  return `${name}:${id}:${Date.now()}`;
}

/** Executes a job in-process. Shared by the inline mode and the worker. */
export async function runJob<K extends JobName>(name: K, data: JobPayloads[K]): Promise<void> {
  const { processDocumentation, runVerificationCheck } = await import('@/lib/analysis/pipeline');

  switch (name) {
    case JobName.ProcessDocumentation:
      await processDocumentation((data as JobPayloads['process-documentation']).documentationId);
      return;
    case JobName.RunVerification:
      await runVerificationCheck((data as JobPayloads['run-verification']).checkId);
      return;
    default: {
      const exhaustive: never = name;
      throw new Error(`مهمة غير معروفة: ${String(exhaustive)}`);
    }
  }
}

async function runInline<K extends JobName>(name: K, data: JobPayloads[K]): Promise<void> {
  try {
    logger.info('job_inline_start', { name, ...data });
    await runJob(name, data);
    logger.info('job_inline_done', { name, ...data });
  } catch (err) {
    // The pipeline already records the failure on the row itself, so this is
    // logging only — an unhandled rejection here would take down the process.
    logger.error('job_inline_failed', { name, err, ...data });
  }
}

export function queueMode(): 'redis' | 'inline' {
  return redisEnabled() ? 'redis' : 'inline';
}
