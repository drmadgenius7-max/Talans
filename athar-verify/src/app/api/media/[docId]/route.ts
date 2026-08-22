import { Readable } from 'node:stream';
import { withErrorHandling, badRequest } from '@/lib/errors';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { requestFingerprint } from '@/lib/security/request';
import { authorizeDocumentationAccess } from '@/lib/services/verification';
import { storage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ docId: string }> };

/**
 * Authenticated media streaming with HTTP Range support.
 *
 * Documentation objects are private in storage and are never linked directly:
 * every read goes through this route, which checks the caller holds a valid
 * verification token first. Range support is what makes seeking work in the
 * video player, and it is required for playback on iOS Safari at all.
 */
export const GET = withErrorHandling('media.stream', async (req: Request, ctx: Params) => {
  const { ipHash } = requestFingerprint(req);
  await enforcePolicy(RateLimits.publicView(ipHash ?? 'anonymous'));

  const { docId } = await ctx.params;
  const token = new URL(req.url).searchParams.get('t');
  const doc = await authorizeDocumentationAccess(docId, token);

  const totalSize = Number(doc.filesize);
  const rangeHeader = req.headers.get('range');

  if (!rangeHeader) {
    const { stream, contentType } = await storage().getStream(doc.storageKey);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        'content-type': contentType || doc.mimeType,
        'content-length': String(totalSize),
        'accept-ranges': 'bytes',
        'cache-control': 'private, max-age=300',
        'content-disposition': 'inline',
        'x-content-type-options': 'nosniff',
      },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) throw badRequest('ترويسة Range غير صالحة.');

  const [, startRaw, endRaw] = match;
  let start: number;
  let end: number;

  if (startRaw === '') {
    // Suffix range: the last N bytes.
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) throw badRequest('ترويسة Range غير صالحة.');
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === '' ? totalSize - 1 : Number(endRaw);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= totalSize) {
    return new Response(null, {
      status: 416,
      headers: { 'content-range': `bytes */${totalSize}`, 'accept-ranges': 'bytes' },
    });
  }

  // Cap each response so one client cannot pull a whole 1 GB file in a single
  // request just by asking for bytes=0-.
  const MAX_CHUNK = 8 * 1024 * 1024;
  end = Math.min(end, totalSize - 1, start + MAX_CHUNK - 1);

  const { stream, contentType } = await storage().getStream(doc.storageKey, { start, end });

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      'content-type': contentType || doc.mimeType,
      'content-length': String(end - start + 1),
      'content-range': `bytes ${start}-${end}/${totalSize}`,
      'accept-ranges': 'bytes',
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  });
});
