import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/config/env';
import { badRequest } from '@/lib/errors';

/**
 * Upload tickets.
 *
 * A presigned upload hands the browser a storage URL. When the browser comes
 * back to register the finished object, the server must be sure the key it is
 * being told about is one *it* issued to *that* admin — otherwise a signed-in
 * operator could register any object in the bucket as documentation for any
 * order. The ticket is an HMAC over exactly those facts.
 */

export type UploadTicketClaims = {
  key: string;
  adminId: string;
  maxBytes: number;
  expiresAt: number;
};

function sign(payload: string): string {
  return createHmac('sha256', env().AUTH_SECRET).update(payload).digest('base64url');
}

export function issueUploadTicket(claims: Omit<UploadTicketClaims, 'expiresAt'>, ttlSeconds = 3600): string {
  const full: UploadTicketClaims = { ...claims, expiresAt: Date.now() + ttlSeconds * 1000 };
  const payload = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyUploadTicket(ticket: string, adminId: string): UploadTicketClaims {
  const [payload, signature] = ticket.split('.');
  if (!payload || !signature) throw badRequest('تذكرة الرفع غير صالحة.');

  const expected = Buffer.from(sign(payload), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw badRequest('تذكرة الرفع غير صالحة.');
  }

  let claims: UploadTicketClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as UploadTicketClaims;
  } catch {
    throw badRequest('تذكرة الرفع غير صالحة.');
  }

  if (claims.expiresAt < Date.now()) throw badRequest('انتهت صلاحية تذكرة الرفع. حاول الرفع مجددًا.');
  if (claims.adminId !== adminId) throw badRequest('تذكرة الرفع لا تخص هذا المستخدم.');

  return claims;
}
