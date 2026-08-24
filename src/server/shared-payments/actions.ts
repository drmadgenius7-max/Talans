"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, getCurrentUser } from "@/server/auth/session";
import { generateSecureToken, generateIdempotencyKey } from "@/lib/tokens";
import { toMinorUnits } from "@/lib/money";
import { allocateEqual, allocateByWeights } from "@/lib/money";
import { notify, logActivity } from "@/server/notifications/notify";
import { createSharedPaymentSchema, contributeSchema } from "@/lib/validation/shared-payments";
import { getPaymentProvider } from "@/server/payments/provider";
import { assertSharedPaymentTransition } from "./state-machine";
import { initiateSharedPaymentContribution } from "@/server/payments/service";
import { checkRateLimit, getRequestIp } from "@/server/security/rate-limit";
import type { ActionResult } from "@/server/auth/actions";

export async function createSharedPaymentAction(input: unknown): Promise<ActionResult & { token?: string }> {
  const user = await requireUser();
  const parsed = createSharedPaymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const data = parsed.data;

  const targetMinor = toMinorUnits(data.targetAmount, data.currency);

  let participantRows: { userId?: string; guestName?: string; guestContact?: string; targetShare?: number }[] = [];

  if (data.splitMethod === "EQUAL") {
    if (data.participants.length === 0) return { success: false, error: "أضف مشاركين على الأقل" };
    const shares = allocateEqual(targetMinor, data.participants.length);
    participantRows = data.participants.map((p, i) => ({ ...p, targetShare: shares[i]! }));
  } else if (data.splitMethod === "CUSTOM") {
    if (data.participants.length === 0) return { success: false, error: "أضف مشاركين على الأقل" };
    const sum = data.participants.reduce((s, p) => s + toMinorUnits(p.targetShare ?? 0, data.currency), 0);
    if (sum !== targetMinor) return { success: false, error: "مجموع الحصص لا يساوي الهدف" };
    participantRows = data.participants.map((p) => ({ ...p, targetShare: toMinorUnits(p.targetShare ?? 0, data.currency) }));
  } else if (data.splitMethod === "PERCENTAGE") {
    if (data.participants.length === 0) return { success: false, error: "أضف مشاركين على الأقل" };
    const totalPct = data.participants.reduce((s, p) => s + (p.targetShare ?? 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) return { success: false, error: "مجموع النسب يجب أن يساوي 100%" };
    const shares = allocateByWeights(
      targetMinor,
      data.participants.map((p) => p.targetShare ?? 0),
    );
    participantRows = data.participants.map((p, i) => ({ ...p, targetShare: shares[i]! }));
  } else {
    participantRows = data.participants.map((p) => ({ ...p }));
  }

  const token = generateSecureToken(24);
  await db.$transaction(async (tx) => {
    const created = await tx.sharedPayment.create({
      data: {
        groupId: data.groupId || null,
        title: data.title,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        targetAmount: targetMinor,
        currency: data.currency,
        createdById: user.id,
        beneficiaryName: data.beneficiaryName || null,
        beneficiaryContact: data.beneficiaryContact || null,
        externalOrderRef: data.externalOrderRef || null,
        splitMethod: data.splitMethod,
        deadline: data.deadline ? new Date(data.deadline) : null,
        privacyShowNames: data.privacyShowNames,
        privacyShowAmounts: data.privacyShowAmounts,
        privacyShowTotal: data.privacyShowTotal,
        allowOverfunding: data.allowOverfunding,
        secureToken: token,
        status: "ACTIVE",
        participants: {
          create: participantRows.map((p) => ({
            userId: p.userId || null,
            guestName: p.userId ? null : p.guestName || null,
            guestContact: p.userId ? null : p.guestContact || null,
            targetShare: p.targetShare,
          })),
        },
      },
    });

    if (data.groupId) {
      await logActivity(tx, {
        groupId: data.groupId,
        actorUserId: user.id,
        type: "SHARED_PAYMENT_CREATED",
        message: `${user.name} أنشأ دفع تشاركي "${data.title}"`,
        targetType: "SharedPayment",
        targetId: created.id,
      });
    }

    for (const p of participantRows) {
      if (p.userId && p.userId !== user.id) {
        await notify(tx, {
          userId: p.userId,
          type: "SHARED_PAYMENT_PROGRESS",
          title: "دعوة للمساهمة",
          body: `${user.name} دعاك للمساهمة في "${data.title}"`,
          data: { sharedPaymentId: created.id },
        });
      }
    }

    return created;
  });

  revalidatePath("/dashboard");
  return { success: true, token };
}

export async function cancelSharedPaymentAction(sharedPaymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const sp = await db.sharedPayment.findUniqueOrThrow({ where: { id: sharedPaymentId } });
  if (sp.createdById !== user.id) return { success: false, error: "غير مصرح" };
  if (["COMPLETED", "REFUNDED", "CANCELLED"].includes(sp.status)) return { success: false, error: "لا يمكن إلغاء هذه العملية" };

  try {
    assertSharedPaymentTransition(sp.status as never, "CANCELLED" as never);
  } catch {
    return { success: false, error: "لا يمكن إلغاء هذه العملية بحالتها الحالية" };
  }

  await db.sharedPayment.update({ where: { id: sharedPaymentId }, data: { status: "CANCELLED", cancelledAt: new Date() } });

  if (sp.collectedAmount > 0) {
    await refundSharedPayment(sharedPaymentId);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function refundSharedPayment(sharedPaymentId: string): Promise<void> {
  const provider = getPaymentProvider();
  const contributions = await db.contribution.findMany({
    where: { sharedPaymentId, transaction: { status: "SUCCEEDED" } },
    include: { transaction: true },
  });

  for (const c of contributions) {
    const result = await provider.refundPayment({
      providerRef: c.transaction.providerRef ?? c.transaction.id,
      amountMinor: c.amount,
      idempotencyKey: generateIdempotencyKey(),
    });

    await db.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          transactionId: c.transactionId,
          amount: c.amount,
          reason: "إلغاء أو انتهاء مهلة القِطّة",
          status: result.status === "SUCCEEDED" ? "SUCCEEDED" : "PENDING",
          providerRef: result.providerRefundRef,
          processedAt: result.status === "SUCCEEDED" ? new Date() : null,
        },
      });
      await tx.transaction.update({ where: { id: c.transactionId }, data: { status: "REFUNDED" } });
      if (c.transaction.contributorUserId) {
        await notify(tx, {
          userId: c.transaction.contributorUserId,
          type: "REFUND_ISSUED",
          title: "تم استرداد مساهمتك",
          body: `تم استرداد ${(c.amount / 100).toFixed(2)} ${c.transaction.currency} من مساهمتك`,
          data: { sharedPaymentId },
        });
      }
    });
  }

  await db.sharedPayment.update({ where: { id: sharedPaymentId }, data: { status: "REFUNDED" } });
}

/** Lazy expiry check — called whenever a shared payment is read. Since we
 * don't have a background scheduler, the deadline is enforced on read: the
 * first request after it passes flips the status and (if funded at all)
 * kicks off the refund workflow. */
export async function ensureNotExpired(sharedPaymentId: string): Promise<void> {
  const sp = await db.sharedPayment.findUnique({ where: { id: sharedPaymentId } });
  if (!sp) return;
  if (!sp.deadline || sp.deadline > new Date()) return;
  if (!["ACTIVE", "PARTIALLY_FUNDED"].includes(sp.status)) return;

  await db.sharedPayment.update({ where: { id: sharedPaymentId }, data: { status: "EXPIRED" } });
  if (sp.collectedAmount > 0) {
    await refundSharedPayment(sharedPaymentId);
  }
}

export async function contributeAction(input: unknown): Promise<ActionResult & { redirectUrl?: string }> {
  const ip = await getRequestIp();
  if (!checkRateLimit(`contribute:${ip}`, 20, 300).allowed) {
    return { success: false, error: "محاولات كثيرة جدًا، حاول مرة أخرى بعد قليل" };
  }

  const parsed = contributeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const data = parsed.data;

  const sp = await db.sharedPayment.findUnique({ where: { secureToken: data.sharedPaymentToken } });
  if (!sp) return { success: false, error: "الرابط غير صالح" };

  await ensureNotExpired(sp.id);

  const user = await getCurrentUser();

  try {
    const result = await initiateSharedPaymentContribution({
      sharedPaymentId: sp.id,
      amountMinor: toMinorUnits(data.amount, sp.currency),
      contributorUserId: user?.id ?? null,
      contributorGuestName: user ? null : data.guestName || "مساهم",
      isAnonymous: data.isAnonymous,
    });
    return { success: true, redirectUrl: result.redirectUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "حدث خطأ" };
  }
}
