import { Readable } from 'node:stream';
import { z } from 'zod';
import { NO_STORE, ok } from '@/lib/api';
import { env } from '@/lib/config/env';
import { badRequest, tooLarge, withErrorHandling } from '@/lib/errors';
import { requireApiUser } from '@/lib/auth/guard';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const keySchema = z.string().regex(/^documentation\/\d{4}\/\d{2}\/[a-f0-9-]{36}(\.[a-z0-9]{1,9})?$/, {
  message: 'مفتاح التخزين غير صالح.',
});

/**
 * Upload target for storage drivers that cannot issue presigned URLs — today
 * that is the local-disk driver used in development and single-box
 * deployments. S3/R2/Supabase deployments never hit this route.
 */
export const PUT = withErrorHandling('admin.uploads.direct', async (req: Request) => {
  await requireApiUser('OPERATOR');

  if (storage().name !== 'local') {
    throw badRequest('هذا المسار مخصص للتخزين المحلي فقط. استخدم رابط الرفع الموقّع.');
  }

  const key = keySchema.parse(new URL(req.url).searchParams.get('key') ?? '');
  const contentType = req.headers.get('content-type') ?? 'application/octet-stream';
  const declaredLength = Number(req.headers.get('content-length') ?? '0');

  if (declaredLength > env().MAX_UPLOAD_BYTES) {
    throw tooLarge('حجم الملف يتجاوز الحد المسموح.');
  }
  if (!req.body) throw badRequest('لا يوجد محتوى في الطلب.');

  const info = await storage().put({
    key,
    body: Readable.fromWeb(req.body as never),
    contentType,
    contentLength: declaredLength || undefined,
  });

  return ok({ key: info.key, size: info.size }, NO_STORE);
});
