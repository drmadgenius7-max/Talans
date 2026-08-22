import { NO_STORE, ok } from '@/lib/api';
import { prisma } from '@/lib/db/prisma';
import { notFound, withErrorHandling } from '@/lib/errors';
import { requireApiUser, recordAudit } from '@/lib/auth/guard';
import { requestFingerprint } from '@/lib/security/request';
import { enqueue, JobName } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Re-runs metadata, frame, and audio extraction.
 *
 * Useful after installing ffmpeg on a server that previously lacked it, or
 * after a transient processing failure. The SHA-256 is *not* recomputed — the
 * registered fingerprint is immutable by design.
 */
export const POST = withErrorHandling('admin.documentation.reprocess', async (req: Request, ctx: Params) => {
  const user = await requireApiUser('OPERATOR');
  const { ipHash } = requestFingerprint(req);
  const { id } = await ctx.params;

  const doc = await prisma.documentation.findFirst({ where: { id, deletedAt: null } });
  if (!doc) throw notFound('الملف غير موجود.');

  await prisma.documentation.update({
    where: { id },
    data: { processingStatus: 'PENDING', processingError: null },
  });

  const { mode } = await enqueue(JobName.ProcessDocumentation, { documentationId: id });
  await recordAudit({
    adminId: user.id,
    action: 'documentation.reprocess',
    entityType: 'Documentation',
    entityId: id,
    ipHash,
  });

  return ok({ queued: true, mode }, NO_STORE);
});
