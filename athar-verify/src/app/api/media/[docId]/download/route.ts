import { Readable } from 'node:stream';
import { withErrorHandling, forbidden } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requestFingerprint } from '@/lib/security/request';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { authorizeDocumentationAccess } from '@/lib/services/verification';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ docId: string }> };

/**
 * Download of the original documentation file.
 *
 * Where the storage driver supports presigned reads, the client is redirected
 * to a short-lived storage URL so the bytes never traverse the app server.
 * Otherwise the file is streamed here. Either way `downloadAllowed` is honoured.
 */
export const GET = withErrorHandling('media.download', async (req: Request, ctx: Params) => {
  const { ipHash } = requestFingerprint(req);
  await enforcePolicy(RateLimits.upload(ipHash ?? 'anonymous'));

  const { docId } = await ctx.params;
  const token = new URL(req.url).searchParams.get('t');
  const doc = await authorizeDocumentationAccess(docId, token);

  if (!doc.downloadAllowed) throw forbidden('تنزيل هذا الملف غير متاح.');

  logger.info('documentation_downloaded', { documentationId: doc.id, ipHash });

  const signed = await storage().createSignedDownloadUrl(
    doc.storageKey,
    600,
    doc.originalFilename,
  );
  if (signed) return Response.redirect(signed, 302);

  const { stream, contentType } = await storage().getStream(doc.storageKey);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'content-type': contentType || doc.mimeType,
      'content-length': doc.filesize.toString(),
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalFilename)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
