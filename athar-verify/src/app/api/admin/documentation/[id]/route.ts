import { z } from 'zod';
import { NO_STORE, ok, readJson } from '@/lib/api';
import { prisma } from '@/lib/db/prisma';
import { notFound, withErrorHandling } from '@/lib/errors';
import { requireApiUser, recordAudit } from '@/lib/auth/guard';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  downloadAllowed: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

/** Only presentation flags are editable. The fingerprint is immutable. */
export const PATCH = withErrorHandling('admin.documentation.update', async (req: Request, ctx: Params) => {
  const user = await requireApiUser('OPERATOR');
  const { ipHash } = requestFingerprint(req);
  const { id } = await ctx.params;
  const input = await readJson(req, patchSchema);

  const doc = await prisma.documentation.findFirst({ where: { id, deletedAt: null } });
  if (!doc) throw notFound('الملف غير موجود.');

  if (input.isPrimary) {
    await prisma.documentation.updateMany({
      where: { orderId: doc.orderId, kind: doc.kind, deletedAt: null },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.documentation.update({ where: { id }, data: input });
  await recordAudit({
    adminId: user.id,
    action: 'documentation.updated',
    entityType: 'Documentation',
    entityId: id,
    detail: input,
    ipHash,
  });

  return ok({ documentation: { ...updated, filesize: updated.filesize.toString() } }, NO_STORE);
});

/**
 * Soft delete.
 *
 * The stored object and its fingerprint are kept: a documentation record is
 * evidence about what was delivered, and destroying it would make past
 * verification results unreproducible.
 */
export const DELETE = withErrorHandling('admin.documentation.delete', async (req: Request, ctx: Params) => {
  const user = await requireApiUser('ADMIN');
  const { ipHash } = requestFingerprint(req);
  const { id } = await ctx.params;

  const doc = await prisma.documentation.findFirst({ where: { id, deletedAt: null } });
  if (!doc) throw notFound('الملف غير موجود.');

  await prisma.documentation.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordAudit({
    adminId: user.id,
    action: 'documentation.deleted',
    entityType: 'Documentation',
    entityId: id,
    detail: { sha256: doc.sha256 },
    ipHash,
  });

  return ok({ deleted: true }, NO_STORE);
});
