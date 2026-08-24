"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import { generateSecureToken } from "@/lib/tokens";
import { toMinorUnits } from "@/lib/money";
import { notify } from "@/server/notifications/notify";
import { createPaymentRequestSchema } from "@/lib/validation/payment-requests";
import { simulatePaymentOutcome, initiatePaymentRequestCharge } from "@/server/payments/service";
import type { ActionResult } from "@/server/auth/actions";
import type { PaymentOutcome } from "@/server/payments/types";

export async function createPaymentRequestAction(input: unknown): Promise<ActionResult & { token?: string }> {
  const user = await requireUser();
  const parsed = createPaymentRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const data = parsed.data;

  if (data.payerUserId === user.id) return { success: false, error: "لا يمكنك مطالبة نفسك" };

  const token = generateSecureToken(24);
  const request = await db.paymentRequest.create({
    data: {
      requesterId: user.id,
      payerUserId: data.payerUserId || null,
      payerGuestName: data.payerUserId ? null : data.payerGuestName || null,
      payerGuestPhone: data.payerUserId ? null : data.payerGuestPhone || null,
      amount: toMinorUnits(data.amount, data.currency),
      currency: data.currency,
      reason: data.reason,
      note: data.note || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      secureToken: token,
      status: "PENDING",
    },
  });

  if (data.payerUserId) {
    await notify(db, {
      userId: data.payerUserId,
      type: "PAYMENT_REQUEST_CREATED",
      title: "مطالبة جديدة",
      body: `${user.name} يطالبك بـ ${data.amount} ${data.currency} عن "${data.reason}"`,
      data: { paymentRequestId: request.id },
    });
  }

  revalidatePath("/dashboard");
  return { success: true, token };
}

export async function cancelPaymentRequestAction(requestId: string): Promise<ActionResult> {
  const user = await requireUser();
  const request = await db.paymentRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.requesterId !== user.id) return { success: false, error: "لا يمكنك إلغاء هذه المطالبة" };
  if (["PAID", "REFUNDED"].includes(request.status)) return { success: false, error: "لا يمكن إلغاء مطالبة مدفوعة" };

  await db.paymentRequest.update({ where: { id: requestId }, data: { status: "CANCELLED", revokedAt: new Date() } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function sendManualReminderAction(requestId: string): Promise<ActionResult> {
  const user = await requireUser();
  const request = await db.paymentRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.requesterId !== user.id) return { success: false, error: "غير مصرح" };

  const lastReminder = request.lastReminderAt;
  if (lastReminder && Date.now() - lastReminder.getTime() < 1000 * 60 * 60 * 6) {
    return { success: false, error: "تم إرسال تذكير مؤخرًا، انتظر قليلًا قبل إعادة الإرسال" };
  }

  await db.$transaction(async (tx) => {
    await tx.reminder.create({
      data: { paymentRequestId: requestId, channel: "IN_APP", scheduledFor: new Date(), sentAt: new Date(), status: "SENT", isAutomatic: false, createdById: user.id },
    });
    await tx.paymentRequest.update({ where: { id: requestId }, data: { lastReminderAt: new Date() } });
    if (request.payerUserId) {
      await notify(tx, {
        userId: request.payerUserId,
        type: "PAYMENT_REQUEST_DUE",
        title: "تذكير بالدفع",
        body: `تذكير: عليك ${(request.amount / 100).toFixed(2)} ${request.currency} عن "${request.reason}"`,
        data: { paymentRequestId: requestId },
      });
    }
  });

  return { success: true };
}

/** Mock-mode only: called from the public /pay/simulate page's outcome buttons. */
export async function simulateMockPaymentAction(transactionId: string, outcome: PaymentOutcome) {
  try {
    await simulatePaymentOutcome(transactionId, outcome);
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "حدث خطأ" };
  }
}

export async function startPaymentRequestChargeAction(paymentRequestId: string, amountMinor?: number) {
  try {
    const result = await initiatePaymentRequestCharge(paymentRequestId, amountMinor);
    return { success: true as const, ...result };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "حدث خطأ" };
  }
}
