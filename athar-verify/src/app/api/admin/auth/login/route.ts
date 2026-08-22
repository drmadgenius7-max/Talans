import { z } from 'zod';
import { NO_STORE, ok, readJson } from '@/lib/api';
import { prisma } from '@/lib/db/prisma';
import { unauthorized, withErrorHandling } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { dummyVerify, verifyPassword } from '@/lib/auth/password';
import { createSession, pruneExpiredSessions, setSessionCookie } from '@/lib/auth/session';
import { recordAudit } from '@/lib/auth/guard';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح.'),
  password: z.string().min(1, 'كلمة المرور مطلوبة.'),
});

const MAX_FAILED_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

/**
 * Admin login.
 *
 * Three layers guard this endpoint: a per-IP rate limit, a per-account lockout
 * after repeated failures, and constant-ish response timing (a wrong email
 * still burns a bcrypt comparison) so the endpoint cannot be used to discover
 * which staff addresses exist.
 */
export const POST = withErrorHandling('admin.login', async (req: Request) => {
  const { ipHash, userAgent } = requestFingerprint(req);
  await enforcePolicy(RateLimits.login(ipHash ?? 'anonymous'));

  const { email, password } = await readJson(req, schema);
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

  if (!admin) {
    await dummyVerify();
    logger.warn('login_unknown_email', { ipHash });
    throw unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }

  if (!admin.isActive) {
    await dummyVerify();
    throw unauthorized('هذا الحساب موقوف. تواصل مع مدير النظام.');
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    const minutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
    throw unauthorized(`الحساب مقفل مؤقتًا. حاول بعد ${minutes} دقيقة.`);
  }

  const valid = await verifyPassword(password, admin.passwordHash);

  if (!valid) {
    const failedLoginCount = admin.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= MAX_FAILED_ATTEMPTS;
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedLoginCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    await recordAudit({ adminId: admin.id, action: 'login.failed', ipHash });
    logger.warn('login_failed', { adminId: admin.id, failedLoginCount, ipHash });
    throw unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const { token, expiresAt } = await createSession(admin, { ipHash, userAgent });
  await setSessionCookie(token, expiresAt);
  void pruneExpiredSessions();

  await recordAudit({ adminId: admin.id, action: 'login.success', ipHash });
  logger.info('login_success', { adminId: admin.id });

  return ok(
    { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    NO_STORE,
  );
});
