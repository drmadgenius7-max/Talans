import { headers } from 'next/headers';
import { hashIp } from './crypto';

/**
 * Best-effort client IP.
 *
 * Trusts `x-forwarded-for` only through its left-most entry, which is what
 * Vercel/Cloudflare/nginx put there. Behind a different proxy chain, set
 * TRUSTED_PROXY_HOPS so the correct hop is selected.
 */
export function clientIpFromHeaders(h: Headers): string | null {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? '0');
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) {
      const idx = hops > 0 ? Math.max(0, parts.length - hops) : 0;
      return parts[idx] ?? parts[0] ?? null;
    }
  }
  return h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? null;
}

export function requestFingerprint(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  return {
    ip,
    ipHash: hashIp(ip),
    userAgent: (req.headers.get('user-agent') ?? '').slice(0, 255) || null,
  };
}

export async function serverRequestFingerprint() {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  return {
    ip,
    ipHash: hashIp(ip),
    userAgent: (h.get('user-agent') ?? '').slice(0, 255) || null,
  };
}
