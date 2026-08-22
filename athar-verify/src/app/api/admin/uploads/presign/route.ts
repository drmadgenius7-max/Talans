import { z } from 'zod';
import { NO_STORE, ok, readJson } from '@/lib/api';
import { env } from '@/lib/config/env';
import { badRequest, tooLarge, withErrorHandling } from '@/lib/errors';
import { requireApiUser } from '@/lib/auth/guard';
import { buildStorageKey, sanitizeFilename, storage } from '@/lib/storage';
import { issueUploadTicket } from '@/lib/security/ticket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(3).max(160),
  size: z.number().int().positive(),
  scope: z.enum(['documentation']).default('documentation'),
});

const ALLOWED_PREFIXES = ['video/', 'image/', 'application/octet-stream'];

/**
 * Issues a direct-to-storage upload URL.
 *
 * Large documentation videos must not pass through the application server — it
 * would tie up a request worker for minutes and cap the practical file size at
 * whatever the platform's body limit happens to be. The browser PUTs straight
 * to object storage, then calls the `documentation` endpoint with the ticket
 * returned here.
 */
export const POST = withErrorHandling('admin.uploads.presign', async (req: Request) => {
  const user = await requireApiUser('OPERATOR');
  const input = await readJson(req, schema);

  if (input.size > env().MAX_UPLOAD_BYTES) {
    throw tooLarge(
      `حجم الملف يتجاوز الحد المسموح (${Math.floor(env().MAX_UPLOAD_BYTES / 1024 / 1024)} ميجابايت).`,
    );
  }
  if (!ALLOWED_PREFIXES.some((prefix) => input.contentType.startsWith(prefix))) {
    throw badRequest('نوع الملف غير مدعوم.');
  }

  const key = buildStorageKey({
    scope: input.scope,
    originalFilename: sanitizeFilename(input.filename),
  });

  const presigned = await storage().createPresignedUpload({
    key,
    contentType: input.contentType,
    maxBytes: input.size,
  });

  const ticket = issueUploadTicket({ key, adminId: user.id, maxBytes: input.size });

  return ok({ ...presigned, ticket, driver: storage().name }, NO_STORE);
});
