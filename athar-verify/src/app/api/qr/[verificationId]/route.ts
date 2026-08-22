import { prisma } from '@/lib/db/prisma';
import { notFound, withErrorHandling } from '@/lib/errors';
import { buildVerificationUrl, renderQrPng, renderQrSvg } from '@/lib/qr';
import { safeEqual, sha256Hex } from '@/lib/security/crypto';
import { getSessionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ verificationId: string }> };

/**
 * Renders the QR code for a verification link.
 *
 * The QR encodes the *full* link including its token, so producing one requires
 * either presenting that token or being a signed-in admin. Otherwise anyone who
 * guessed a verification id could mint a working link.
 */
export const GET = withErrorHandling('qr.render', async (req: Request, ctx: Params) => {
  const { verificationId } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const format = url.searchParams.get('format') === 'png' ? 'png' : 'svg';

  const link = await prisma.verificationLink.findUnique({
    where: { verificationId },
    include: { order: { select: { deletedAt: true } } },
  });

  if (!link || !link.isActive || link.order?.deletedAt) throw notFound('رابط التحقق غير موجود.');

  const tokenValid = token != null && safeEqual(sha256Hex(token), link.tokenHash);
  if (!tokenValid) {
    const user = await getSessionUser();
    if (!user) throw notFound('رابط التحقق غير موجود.');
  }

  const target = buildVerificationUrl(link.verificationId, link.token);

  if (format === 'png') {
    const png = await renderQrPng(target);
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'private, max-age=3600',
        'content-disposition': `inline; filename="${link.verificationId}.png"`,
      },
    });
  }

  const svg = await renderQrSvg(target);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'private, max-age=3600',
    },
  });
});
