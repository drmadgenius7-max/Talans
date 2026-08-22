import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { NO_STORE, ok } from '@/lib/api';
import { env } from '@/lib/config/env';
import { prisma } from '@/lib/db/prisma';
import { badRequest, notFound, tooLarge, withErrorHandling } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { sha256OfFile } from '@/lib/media/hash';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { requestFingerprint } from '@/lib/security/request';
import { buildStorageKey, sanitizeFilename, storage } from '@/lib/storage';
import { startVerificationCheck } from '@/lib/services/verification';
import { normalizeOrderNumber } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ALLOWED_PREFIXES = ['video/', 'application/octet-stream'];

/**
 * "هل لديك نسخة من الفيديو؟ تحقق منها"
 *
 * Accepts the customer's own copy, fingerprints it, and schedules the
 * comparison. Two properties matter here:
 *
 *  1. The file is streamed to a temp file and hashed in one pass — a 300 MB
 *     video is never held in memory.
 *  2. A SHA-256 match is answered synchronously, because it needs no media
 *     processing and it is the answer most customers will get.
 */
export const POST = withErrorHandling('public.verifyUpload', async (req: Request) => {
  const { ipHash, userAgent } = requestFingerprint(req);
  await enforcePolicy(RateLimits.upload(ipHash ?? 'anonymous'));

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw badRequest('يجب إرسال الملف بصيغة multipart/form-data.');
  }

  const form = await req.formData();
  const orderNumberRaw = form.get('orderNumber');
  const file = form.get('file');

  if (typeof orderNumberRaw !== 'string' || !orderNumberRaw.trim()) {
    throw badRequest('رقم الطلب مطلوب.');
  }
  if (!(file instanceof File)) throw badRequest('لم يتم إرفاق ملف.');

  const maxBytes = env().MAX_CUSTOMER_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    throw tooLarge(`حجم الملف يتجاوز الحد المسموح (${Math.floor(maxBytes / 1024 / 1024)} ميجابايت).`);
  }
  if (file.size === 0) throw badRequest('الملف فارغ.');

  const mimeType = file.type || 'application/octet-stream';
  if (!ALLOWED_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
    throw badRequest('نوع الملف غير مدعوم. ارفع ملف فيديو.');
  }

  const orderNumber = normalizeOrderNumber(orderNumberRaw);
  const order = await prisma.order.findFirst({
    where: { orderNumber, deletedAt: null },
    include: {
      documentation: {
        where: { deletedAt: null, kind: 'VIDEO' },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        take: 1,
      },
    },
  });

  if (!order) throw notFound('لم نعثر على طلب بهذا الرقم.');
  const original = order.documentation[0];
  if (!original) throw notFound('لا يوجد توثيق فيديو مسجل لهذا الطلب للمقارنة معه.');

  const dir = await mkdtemp(path.join(tmpdir(), 'athar-upload-'));
  const filename = sanitizeFilename(file.name || 'upload.mp4');
  const localPath = path.join(dir, 'candidate');

  try {
    await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(localPath));

    const written = await stat(localPath);
    if (written.size > maxBytes) throw tooLarge('حجم الملف يتجاوز الحد المسموح.');

    const { hash } = await sha256OfFile(localPath);
    const hashMatch = hash.toLowerCase() === original.sha256.toLowerCase();

    // Exact match: answer immediately, store nothing but the report.
    if (hashMatch) {
      const check = await prisma.verificationCheck.create({
        data: {
          orderId: order.id,
          documentationId: original.id,
          source: 'CUSTOMER_UPLOAD',
          uploadedFilename: filename,
          uploadedFileHash: hash,
          uploadedFilesize: BigInt(written.size),
          uploadedMimeType: mimeType,
          hashMatch: true,
          confidenceScore: 100,
          result: 'VERIFIED_ORIGINAL',
          processingStatus: 'READY',
          completedAt: new Date(),
          ipHash,
          userAgent,
        },
      });

      logger.info('verify_upload_hash_match', { orderId: order.id, checkId: check.id });
      return ok(
        {
          checkId: check.id,
          status: 'READY' as const,
          immediate: true,
          uploadedHash: hash,
        },
        NO_STORE,
      );
    }

    // Different bytes — the file still needs content analysis. Park it in
    // storage under a temp key; the pipeline deletes it once the check ends.
    const candidateKey = buildStorageKey({ scope: 'uploads', originalFilename: filename });
    await storage().put({
      key: candidateKey,
      body: createReadStream(localPath),
      contentType: mimeType,
      contentLength: written.size,
    });

    const { checkId, mode } = await startVerificationCheck({
      orderId: order.id,
      documentationId: original.id,
      candidateKey,
      uploadedFilename: filename,
      uploadedFileHash: hash,
      uploadedFilesize: written.size,
      uploadedMimeType: mimeType,
      ipHash,
      userAgent,
    });

    logger.info('verify_upload_queued', { orderId: order.id, checkId, mode });
    return ok(
      { checkId, status: 'PENDING' as const, immediate: false, uploadedHash: hash },
      NO_STORE,
    );
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});
