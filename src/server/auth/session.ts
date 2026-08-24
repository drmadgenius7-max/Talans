import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateSecureToken, hashToken } from "@/lib/tokens";
import type { User } from "@prisma/client";

const MAX_AGE_SECONDS = env.sessionMaxAgeDays * 24 * 60 * 60;

export async function createSession(userId: string): Promise<string> {
  const token = generateSecureToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);

  const hdrs = await headers();
  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: hdrs.get("user-agent")?.slice(0, 255) ?? null,
      ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookieName, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return token;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE" || session.user.deletedAt) return null;

  return session.user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN");
  return user;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.sessionCookieName)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(env.sessionCookieName);
}

export async function revokeSessionById(sessionId: string, userId: string): Promise<void> {
  await db.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listActiveSessions(userId: string) {
  return db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export class AuthError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.code = code;
  }
}
