import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import type { Admin, AdminRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { env, isProd } from '@/lib/config/env';
import { sha256Hex } from '@/lib/security/crypto';
import { logger } from '@/lib/logger';

export const SESSION_COOKIE = '__Host-athar_session';
/** `__Host-` requires Secure, which is unavailable over plain http in dev. */
export const SESSION_COOKIE_DEV = 'athar_session';

export function sessionCookieName(): string {
  return isProd() ? SESSION_COOKIE : SESSION_COOKIE_DEV;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

/**
 * Creates a database-backed session and returns the opaque secret to be stored
 * in the cookie. Only the SHA-256 of the secret is persisted, so a database
 * leak does not hand over live sessions.
 */
export async function createSession(
  admin: Admin,
  meta: { ipHash?: string | null; userAgent?: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + env().SESSION_TTL_HOURS * 3600_000);

  await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: sha256Hex(token),
      expiresAt,
      ipHash: meta.ipHash ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(sessionCookieName(), '', { httpOnly: true, secure: isProd(), sameSite: 'lax', path: '/', maxAge: 0 });
}

/** Resolves the current admin from the session cookie, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { admin: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.admin.isActive) return null;

  return {
    id: session.admin.id,
    name: session.admin.name,
    email: session.admin.email,
    role: session.admin.role,
  };
}

export async function revokeSession(token: string): Promise<void> {
  try {
    await prisma.adminSession.updateMany({
      where: { tokenHash: sha256Hex(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    logger.warn('session_revoke_failed', { err });
  }
}

export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await revokeSession(token);
  await clearSessionCookie();
}

/** Housekeeping: drop expired rows. Called opportunistically after login. */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    await prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 7 * 24 * 3600_000) } },
    });
  } catch {
    /* non-fatal */
  }
}
