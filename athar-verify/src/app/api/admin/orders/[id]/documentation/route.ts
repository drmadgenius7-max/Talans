import { z } from 'zod';
import { NO_STORE, ok, readJson } from '@/lib/api';
import { prisma } from '@/lib/db/prisma';
import { badRequest, conflict, notFound, withErrorHandling } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireApiUser, recordAudit } from '@/lib/auth/guard';
import { requestFingerprint } from '@/lib/security/request';
import { verifyUploadTicket } from '@/lib/security/ticket';
import { storage } from '@/lib/storage';
import { sha256OfStream } from '@/lib/media/hash';
import { enqueue, JobName } from '@/lib/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  ticket: z.string().min(10),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(160),
  kind: z.enum(['VIDEO', 'IMAGE', 'DOCUMENT']).default('VIDEO'),
  downloadAllowed: z.boolean().default(true),
  isPrimary: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

/**
 * Registers an uploaded object as documentation for an order.
 *
 * This is where the digital fingerprint is created. The hash is computed by the
 * server reading the object back out of storage — never trusted from the
 * client — and it is written exactly once: the column is never updated
 * afterwards, so the fingerprint on record is always the one taken at
 * registration.
 */
export const POST = withErrorHandling('admin.documentation.create', async (req: Request, ctx: Params) => {
  const user = await requireApiUser('OPERATOR');
  const { ipHash } = requestFingerprint(req);
  const { id: orderId } = await ctx.params;

  const order = await prisma.order.findFirst({ where: { id: orderId, deletedAt: null } });
  if (!order) throw notFound('الطلب غير موجود.');

  const input = await readJson(req, schema);
  const claims = verifyUploadTicket(input.ticket, user.id);

  const head = await storage().head(claims.key);
  if (!head) throw badRequest('لم يتم العثور على الملف المرفوع. أعد المحاولة.');
  if (head.size === 0) throw badRequest('الملف المرفوع فارغ.');
  if (head.size > claims.maxBytes * 1.05) {
    throw badRequest('حجم الملف المرفوع لا يطابق الحجم المعلن.');
  }

  // Fingerprint the bytes as they now exist in storage.
  const { stream } = await storage().getStream(claims.key);
  const { hash, bytes } = await sha256OfStream(stream);

  const duplicate = await prisma.documentation.findFirst({
    where: { sha256: hash, orderId, deletedAt: null },
  });
  if (duplicate) throw conflict('هذا الملف مسجل مسبقًا لهذا الطلب.');

  if (input.isPrimary) {
    await prisma.documentation.updateMany({
      where: { orderId, kind: input.kind, deletedAt: null },
      data: { isPrimary: false },
    });
  }

  const doc = await prisma.documentation.create({
    data: {
      orderId,
      kind: input.kind,
      storageKey: claims.key,
      storageDriver: storage().name,
      originalFilename: input.originalFilename,
      sha256: hash,
      filesize: BigInt(bytes),
      mimeType: input.mimeType,
      downloadAllowed: input.downloadAllowed,
      isPrimary: input.isPrimary,
      sortOrder: input.sortOrder,
      uploadedById: user.id,
      processingStatus: 'PENDING',
    },
  });

  const { mode } = await enqueue(JobName.ProcessDocumentation, { documentationId: doc.id });

  await recordAudit({
    adminId: user.id,
    action: 'documentation.registered',
    entityType: 'Documentation',
    entityId: doc.id,
    detail: { orderNumber: order.orderNumber, sha256: hash, bytes },
    ipHash,
  });
  logger.info('documentation_registered', { documentationId: doc.id, orderId, mode });

  return ok(
    {
      documentation: { ...doc, filesize: doc.filesize.toString() },
      processing: mode,
    },
    { ...NO_STORE, status: 201 },
  );
});
