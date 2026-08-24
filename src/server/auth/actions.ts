"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { generateSecureToken, hashToken } from "@/lib/tokens";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  isEmailLike,
} from "@/lib/validation/auth";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "./password";
import { createSession, destroyCurrentSession, getCurrentUser, requireUser, revokeSessionById } from "./session";
import { mockEmailProvider, mockSmsProvider } from "@/server/notifications/providers/mock-providers";
import { env } from "@/lib/env";

export interface ActionResult {
  success: boolean;
  error?: string;
}

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

export async function signUpAction(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.data ? "بيانات غير صحيحة" : parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { name, email, phone, password } = parsed.data;

  if (email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: "هذا البريد الإلكتروني مستخدم مسبقًا" };
  }
  if (phone) {
    const existing = await db.user.findUnique({ where: { phone: normalizePhone(phone) } });
    if (existing) return { success: false, error: "رقم الجوال هذا مستخدم مسبقًا" };
  }
  if (!isPasswordStrongEnough(password)) {
    return { success: false, error: "كلمة المرور ضعيفة جدًا" };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email: email || null,
      phone: phone ? normalizePhone(phone) : null,
      passwordHash,
      preference: { create: {} },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Log in / log out
// ---------------------------------------------------------------------------

export async function logInAction(input: unknown, redirectTo?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { identifier, password } = parsed.data;

  const user = isEmailLike(identifier)
    ? await db.user.findUnique({ where: { email: identifier.trim().toLowerCase() } })
    : await db.user.findUnique({ where: { phone: normalizePhone(identifier) } });

  if (!user || user.status !== "ACTIVE" || user.deletedAt) {
    return { success: false, error: "بيانات الدخول غير صحيحة" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "بيانات الدخول غير صحيحة" };
  }

  await createSession(user.id);
  redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function logOutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { identifier } = parsed.data;

  const user = isEmailLike(identifier)
    ? await db.user.findUnique({ where: { email: identifier.trim().toLowerCase() } })
    : await db.user.findUnique({ where: { phone: normalizePhone(identifier) } });

  // Always report success to avoid leaking whether an account exists.
  if (!user) return { success: true };

  const token = generateSecureToken(32);
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${env.appUrl}/reset-password/${token}`;
  const message = `طلبت إعادة تعيين كلمة المرور في قِطّة. اضغط على الرابط خلال 30 دقيقة:\n${resetUrl}\n\nإذا لم تطلب هذا، تجاهل الرسالة.`;

  if (user.email) {
    await mockEmailProvider.send({ to: user.email, subject: "إعادة تعيين كلمة المرور — قِطّة", body: message });
  } else if (user.phone) {
    await mockSmsProvider.send({ to: user.phone, body: message });
  }

  return { success: true };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { token, password } = parsed.data;

  const tokenHash = hashToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { success: false, error: "رابط إعادة التعيين غير صالح أو منتهي" };
  }
  if (!isPasswordStrongEnough(password)) {
    return { success: false, error: "كلمة المرور ضعيفة جدًا" };
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Revoke all existing sessions on password change, for safety.
    db.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  return { success: true };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const data = parsed.data;

  if (data.email && data.email !== user.email) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) return { success: false, error: "هذا البريد الإلكتروني مستخدم مسبقًا" };
  }
  if (data.phone) {
    const normalized = normalizePhone(data.phone);
    if (normalized !== user.phone) {
      const existing = await db.user.findUnique({ where: { phone: normalized } });
      if (existing) return { success: false, error: "رقم الجوال هذا مستخدم مسبقًا" };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone ? normalizePhone(data.phone) : null,
      defaultCurrency: data.defaultCurrency,
      country: data.country,
      locale: data.locale,
      avatarUrl: data.avatarUrl || null,
    },
  });

  return { success: true };
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
  if (!isPasswordStrongEnough(parsed.data.newPassword)) {
    return { success: false, error: "كلمة المرور الجديدة ضعيفة جدًا" };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: true };
}

export async function deleteAccountAction(): Promise<ActionResult> {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: {
      status: "DELETED",
      deletedAt: new Date(),
      email: null,
      phone: null,
    },
  });
  await db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await destroyCurrentSession();
  redirect("/");
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();
  await revokeSessionById(sessionId, user.id);
  return { success: true };
}

export async function getCurrentUserSafe() {
  return getCurrentUser();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0")) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5")) return `+966${digits}`;
  return `+${digits}`;
}
