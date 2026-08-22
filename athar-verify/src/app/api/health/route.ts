import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ffmpegAvailability } from '@/lib/media/ffmpeg';
import { queueMode } from '@/lib/queue';
import { env } from '@/lib/config/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness/readiness probe.
 *
 * Reports component status without leaking configuration. `ffmpeg: false` is
 * reported as degraded rather than unhealthy — hash verification, the primary
 * proof, still works without it.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'degraded' | 'down'> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'down';
  }

  try {
    const availability = await ffmpegAvailability();
    checks.ffmpeg = availability.ffmpeg && availability.ffprobe ? 'ok' : 'degraded';
  } catch {
    checks.ffmpeg = 'degraded';
  }

  checks.queue = queueMode() === 'redis' ? 'ok' : 'degraded';
  checks.storage = env().STORAGE_DRIVER === 'local' ? 'degraded' : 'ok';

  const healthy = checks.database === 'ok';

  return NextResponse.json(
    {
      ok: healthy,
      status: healthy ? (Object.values(checks).includes('degraded') ? 'degraded' : 'healthy') : 'unhealthy',
      checks,
      queueMode: queueMode(),
      storageDriver: env().STORAGE_DRIVER,
      aiProvider: env().AI_ANALYSIS_PROVIDER,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
