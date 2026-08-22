import 'server-only';
import { redirect } from 'next/navigation';
import type { AdminRole } from '@prisma/client';
import { getSessionUser, type SessionUser } from './session';
import { forbidden, unauthorized } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';

/** Higher number == more privilege. */
const ROLE_RANK: Record<AdminRole, number> = {
  VIEWER: 1,
  OPERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function roleAtLeast(role: AdminRole, minimum: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** For API routes — throws an AppError that the error wrapper turns into JSON. */
export async function requireApiUser(minimum: AdminRole = 'VIEWER'): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  if (!roleAtLeast(user.role, minimum)) throw forbidden();
  return user;
}

/** For server components — redirects to the login page instead of throwing. */
export async function requirePageUser(
  minimum: AdminRole = 'VIEWER',
  returnTo?: string,
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const qs = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
    redirect(`/admin/login${qs}`);
  }
  if (!roleAtLeast(user.role, minimum)) redirect('/admin?error=forbidden');
  return user;
}

export async function recordAudit(input: {
  adminId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
  ipHash?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        detail: (input.detail as never) ?? undefined,
        ipHash: input.ipHash ?? null,
      },
    });
  } catch {
    // Auditing must never break the operation it is recording.
  }
}
