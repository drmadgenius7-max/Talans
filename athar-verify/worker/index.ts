/**
 * Standalone media worker.
 *
 * Run this alongside the web app when REDIS_URL is configured:
 *
 *   npm run worker
 *
 * Without Redis the web process executes jobs inline and this worker is not
 * needed — it exits with a clear message rather than idling silently.
 */
import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import { env } from '../src/lib/config/env';
import { logger } from '../src/lib/logger';
import { getRedis } from '../src/lib/queue/redis';
import { QUEUE_NAME, runJob, type JobName, type JobPayloads } from '../src/lib/queue';
import { prisma } from '../src/lib/db/prisma';
import { ffmpegAvailability } from '../src/lib/media/ffmpeg';

async function main() {
  const connection = getRedis();
  if (!connection) {
    logger.error('worker_no_redis', {
      hint: 'REDIS_URL غير مضبوط. التطبيق ينفذ المهام داخليًا ولا حاجة لتشغيل worker.',
    });
    process.exit(1);
  }

  const availability = await ffmpegAvailability();
  logger.info('worker_starting', {
    queue: QUEUE_NAME,
    concurrency: env().QUEUE_CONCURRENCY,
    ffmpeg: availability.ffmpeg,
    ffprobe: availability.ffprobe,
  });

  if (!availability.ffmpeg || !availability.ffprobe) {
    logger.warn('worker_ffmpeg_missing', {
      hint: 'سيعمل الـ worker لكن تحليل التشابه سيكون غير متاح. ثبّت ffmpeg.',
    });
  }

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const started = Date.now();
      logger.info('job_start', { id: job.id, name: job.name });
      await runJob(job.name as JobName, job.data as JobPayloads[JobName]);
      logger.info('job_done', { id: job.id, name: job.name, ms: Date.now() - started });
    },
    {
      connection,
      prefix: env().QUEUE_PREFIX,
      concurrency: env().QUEUE_CONCURRENCY,
      // Media jobs are long; give a generous lock and renew it while running.
      lockDuration: 5 * 60_000,
      stalledInterval: 60_000,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('job_failed', { id: job?.id, name: job?.name, attempts: job?.attemptsMade, err });
  });

  worker.on('error', (err) => logger.error('worker_error', { err }));

  const shutdown = async (signal: string) => {
    logger.info('worker_shutdown', { signal });
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('worker_crashed', { err });
  process.exit(1);
});
