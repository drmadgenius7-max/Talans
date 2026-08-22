import { Readable } from 'node:stream';
import { withErrorHandling, notFound } from '@/lib/errors';
import { requestFingerprint } from '@/lib/security/request';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { authorizeDocumentationAccess } from '@/lib/services/verification';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ docId: string }> };

/** Poster frame for the player. Same token gate as the video itself. */
export const GET = withErrorHandling('media.thumbnail', async (req: Request, ctx: Params) => {
  const { ipHash } = requestFingerprint(req);
  await enforcePolicy(RateLimits.publicView(ipHash ?? 'anonymous'));

  const { docId } = await ctx.params;
  const token = new URL(req.url).searchParams.get('t');
  const doc = await authorizeDocumentationAccess(docId, token);

  if (!doc.thumbnailKey) throw notFound('لا توجد صورة مصغّرة لهذا الملف.');

  const { stream, contentType } = await storage().getStream(doc.thumbnailKey);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'content-type': contentType || 'image/jpeg',
      'cache-control': 'private, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
});
