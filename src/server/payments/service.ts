import "server-only";
import { db } from "@/lib/db";
import { generateIdempotencyKey } from "@/lib/tokens";
import { formatMoney } from "@/lib/money";
import { getPaymentProvider, assertRealPaymentsAllowed } from "./provider";
import { MockPaymentProvider } from "./mock-provider";
import type { WebhookEvent } from "./types";
import { deriveStatusFromPayment, assertPaymentRequestTransition } from "@/server/payment-requests/state-machine";
import { deriveFundingStatus, assertSharedPaymentTransition } from "@/server/shared-payments/state-machine";
import { recordPaymentRequestLedger } from "@/server/ledger/ledger";
import { notify, logActivity } from "@/server/notifications/notify";
import type { PaymentOutcome } from "./types";

export class PaymentFlowError extends Error {}

// ---------------------------------------------------------------------------
// Initiating charges
// ---------------------------------------------------------------------------

export async function initiatePaymentRequestCharge(paymentRequestId: string, amountMinor?: number) {
  assertRealPaymentsAllowed();

  const request = await db.paymentRequest.findUniqueOrThrow({ where: { id: paymentRequestId } });

  if (["PAID", "CANCELLED", "REFUNDED"].includes(request.status)) {
    throw new PaymentFlowError("هذه المطالبة لم تعد قابلة للدفع");
  }
  if (request.revokedAt) throw new PaymentFlowError("تم إلغاء رابط الدفع");
  if (request.tokenExpiresAt && request.tokenExpiresAt < new Date()) {
    throw new PaymentFlowError("انتهت صلاحية رابط الدفع");
  }

  const remaining = request.amount - request.paidAmount;
  const amount = amountMinor ?? remaining;
  if (amount <= 0 || amount > remaining) {
    throw new PaymentFlowError("المبلغ غير صالح");
  }

  const idempotencyKey = generateIdempotencyKey();
  const transaction = await db.transaction.create({
    data: {
      type: "CHARGE",
      purpose: "PAYMENT_REQUEST",
      paymentRequestId: request.id,
      contributorUserId: request.payerUserId,
      contributorGuestName: request.payerGuestName,
      amount,
      currency: request.currency,
      status: "PENDING",
      idempotencyKey,
    },
  });

  const provider = getPaymentProvider();
  const result = await provider.createPayment({
    internalTransactionId: transaction.id,
    amountMinor: amount,
    currency: request.currency,
    description: request.reason,
    idempotencyKey,
  });

  await db.transaction.update({
    where: { id: transaction.id },
    data: { providerRef: result.providerRef },
  });

  if (request.status === "PENDING") {
    await db.paymentRequest.update({ where: { id: request.id }, data: { status: "VIEWED", viewedAt: request.viewedAt ?? new Date() } });
  }

  return { transactionId: transaction.id, redirectUrl: result.redirectUrl };
}

export async function initiateSharedPaymentContribution(args: {
  sharedPaymentId: string;
  amountMinor: number;
  contributorUserId?: string | null;
  contributorGuestName?: string | null;
  isAnonymous?: boolean;
}) {
  assertRealPaymentsAllowed();

  const sp = await db.sharedPayment.findUniqueOrThrow({ where: { id: args.sharedPaymentId } });

  if (!["ACTIVE", "PARTIALLY_FUNDED"].includes(sp.status)) {
    throw new PaymentFlowError("هذه القِطّة لم تعد تقبل المساهمات");
  }
  if (sp.deadline && sp.deadline < new Date()) {
    throw new PaymentFlowError("انتهت مهلة هذه القِطّة");
  }

  const remaining = sp.targetAmount - sp.collectedAmount;
  if (args.amountMinor <= 0) throw new PaymentFlowError("المبلغ غير صالح");
  if (!sp.allowOverfunding && args.amountMinor > remaining) {
    throw new PaymentFlowError(`لا يمكن أن تتجاوز المساهمة المبلغ المتبقي (${formatMoney(remaining, sp.currency)})`);
  }

  const idempotencyKey = generateIdempotencyKey();
  const transaction = await db.transaction.create({
    data: {
      type: "CHARGE",
      purpose: "SHARED_PAYMENT_CONTRIBUTION",
      sharedPaymentId: sp.id,
      contributorUserId: args.contributorUserId ?? null,
      contributorGuestName: args.contributorGuestName ?? null,
      isAnonymous: args.isAnonymous ?? false,
      amount: args.amountMinor,
      currency: sp.currency,
      status: "PENDING",
      idempotencyKey,
    },
  });

  const provider = getPaymentProvider();
  const result = await provider.createPayment({
    internalTransactionId: transaction.id,
    amountMinor: args.amountMinor,
    currency: sp.currency,
    description: sp.title,
    idempotencyKey,
  });

  await db.transaction.update({ where: { id: transaction.id }, data: { providerRef: result.providerRef } });

  return { transactionId: transaction.id, redirectUrl: result.redirectUrl };
}

// ---------------------------------------------------------------------------
// Mock simulator entry point
// ---------------------------------------------------------------------------

export async function simulatePaymentOutcome(transactionId: string, outcome: PaymentOutcome) {
  const provider = getPaymentProvider();
  if (!(provider instanceof MockPaymentProvider)) {
    throw new PaymentFlowError("المحاكاة متاحة فقط في وضع الدفع التجريبي");
  }
  const txn = await db.transaction.findUniqueOrThrow({ where: { id: transactionId } });
  if (txn.status !== "PENDING" && txn.status !== "PROCESSING") {
    throw new PaymentFlowError("تمت معالجة هذه العملية مسبقًا");
  }

  const { rawBody, signature } = provider.buildSimulatedWebhookPayload({
    transactionId,
    amountMinor: txn.amount,
    currency: txn.currency,
    outcome,
  });

  const event = await provider.handleWebhook(rawBody, signature);
  await processWebhookEvent(event, provider.name);
  return event;
}

// ---------------------------------------------------------------------------
// Webhook processing (shared by mock simulator and /api/webhooks/payments)
// ---------------------------------------------------------------------------

const EVENT_TYPE_TO_STATUS: Record<WebhookEvent["type"], PaymentOutcome | "REFUNDED"> = {
  "payment.pending": "PENDING",
  "payment.succeeded": "SUCCEEDED",
  "payment.failed": "FAILED",
  "payment.cancelled": "CANCELLED",
  "refund.succeeded": "REFUNDED",
  "refund.failed": "FAILED",
};

export async function processWebhookEvent(event: WebhookEvent, providerName: string) {
  return db.$transaction(async (tx) => {
    // Idempotency: unique(provider, providerEventId) rejects replays/retries.
    const txn = await tx.transaction.findFirst({ where: { providerRef: event.providerRef } });
    if (!txn) return { duplicate: false, skipped: true as const };

    try {
      await tx.transactionEvent.create({
        data: {
          transactionId: txn.id,
          provider: providerName,
          providerEventId: event.eventId,
          type: event.type,
          payload: event.raw as object,
        },
      });
    } catch (err: unknown) {
      if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
        return { duplicate: true as const };
      }
      throw err;
    }

    const newStatus = EVENT_TYPE_TO_STATUS[event.type];
    await tx.transaction.update({ where: { id: txn.id }, data: { status: newStatus } });

    if (newStatus === "SUCCEEDED") {
      if (txn.purpose === "PAYMENT_REQUEST" && txn.paymentRequestId) {
        await applyPaymentRequestSuccess(tx, txn.paymentRequestId, txn.id, txn.amount);
      } else if (txn.purpose === "SHARED_PAYMENT_CONTRIBUTION" && txn.sharedPaymentId) {
        await applySharedPaymentContributionSuccess(tx, txn.sharedPaymentId, txn.id, txn.amount, {
          contributorUserId: txn.contributorUserId,
          contributorGuestName: txn.contributorGuestName,
          isAnonymous: txn.isAnonymous,
        });
      }
    }

    return { duplicate: false as const };
  });
}

type DbTx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function applyPaymentRequestSuccess(tx: DbTx, paymentRequestId: string, transactionId: string, amount: number) {
  const request = await tx.paymentRequest.findUniqueOrThrow({ where: { id: paymentRequestId } });
  const paidAmount = request.paidAmount + amount;
  const nextStatus = deriveStatusFromPayment(paidAmount, request.amount, request.dueDate);
  assertPaymentRequestTransition(request.status as never, nextStatus as never);

  await tx.paymentRequest.update({
    where: { id: request.id },
    data: { paidAmount, status: nextStatus },
  });

  if (request.groupId) {
    // Prefer the direct FKs set at request-creation time — they correctly
    // identify guest (no-account) members, which payerUserId can't since
    // it's null for guests. Fall back to a userId lookup only for legacy
    // rows created before these columns existed.
    const [payerMember, requesterMember] = await Promise.all([
      request.payerMemberId
        ? tx.groupMember.findUnique({ where: { id: request.payerMemberId } })
        : request.payerUserId
          ? tx.groupMember.findFirst({ where: { groupId: request.groupId, userId: request.payerUserId } })
          : null,
      request.requesterMemberId
        ? tx.groupMember.findUnique({ where: { id: request.requesterMemberId } })
        : tx.groupMember.findFirst({ where: { groupId: request.groupId, userId: request.requesterId } }),
    ]);
    if (payerMember && requesterMember) {
      await recordPaymentRequestLedger(tx, {
        groupId: request.groupId,
        payerMemberId: payerMember.id,
        requesterMemberId: requesterMember.id,
        amount,
        currency: request.currency,
        reason: request.reason,
        paymentRequestId: request.id,
        transactionId,
      });
    }
    await logActivity(tx, {
      groupId: request.groupId,
      actorUserId: request.payerUserId ?? undefined,
      type: "PAYMENT_REQUEST_PAID",
      message: `تم دفع ${formatMoney(amount, request.currency)} عن "${request.reason}"`,
      targetType: "PaymentRequest",
      targetId: request.id,
    });
  }

  await notify(tx, {
    userId: request.requesterId,
    type: "PAYMENT_RECEIVED",
    title: "استلمت دفعة جديدة",
    body: `تم استلام ${formatMoney(amount, request.currency)} عن "${request.reason}"`,
    data: { paymentRequestId: request.id },
  });
}

async function applySharedPaymentContributionSuccess(
  tx: DbTx,
  sharedPaymentId: string,
  transactionId: string,
  amount: number,
  contributor: { contributorUserId: string | null; contributorGuestName: string | null; isAnonymous: boolean },
) {
  // Atomic, race-safe increment: only succeeds if it won't push collected
  // past target unless overfunding is explicitly allowed. This is what
  // prevents two concurrent "last contribution" payments from both landing
  // when only one should fit (spec §63/§20).
  const updated = await tx.$queryRaw<{ id: string; collectedAmount: number; targetAmount: number; currency: string; status: string; allowOverfunding: boolean }[]>`
    UPDATE "SharedPayment"
    SET "collectedAmount" = "collectedAmount" + ${amount}
    WHERE id = ${sharedPaymentId}
      AND ("allowOverfunding" = true OR "collectedAmount" + ${amount} <= "targetAmount")
    RETURNING id, "collectedAmount", "targetAmount", currency, status, "allowOverfunding"
  `;

  if (updated.length === 0) {
    // Overfunding would occur — reject this contribution instead of silently
    // over-collecting. The charge itself already "succeeded" in mock terms,
    // so we record it as a failed contribution requiring a refund.
    await tx.transaction.update({ where: { id: transactionId }, data: { status: "FAILED", failureReason: "OVERFUNDING_REJECTED" } });
    return;
  }

  const sp = updated[0]!;
  await tx.contribution.create({
    data: {
      sharedPaymentId,
      transactionId,
      amount,
      isAnonymous: contributor.isAnonymous,
    },
  });

  if (contributor.contributorUserId) {
    const participant = await tx.sharedPaymentParticipant.findFirst({
      where: { sharedPaymentId, userId: contributor.contributorUserId },
    });
    if (participant) {
      const paidAmount = participant.paidAmount + amount;
      await tx.sharedPaymentParticipant.update({
        where: { id: participant.id },
        data: {
          paidAmount,
          status: participant.targetShare && paidAmount >= participant.targetShare ? "PAID" : "PARTIAL",
        },
      });
    }
  }

  const nextStatus = deriveFundingStatus(sp.collectedAmount, sp.targetAmount, sp.status as never);
  if (nextStatus !== sp.status) {
    assertSharedPaymentTransition(sp.status as never, nextStatus as never);
    await tx.sharedPayment.update({
      where: { id: sharedPaymentId },
      data: { status: nextStatus, completedAt: nextStatus === "FUNDED" ? new Date() : undefined },
    });
  }

  const parent = await tx.sharedPayment.findUniqueOrThrow({ where: { id: sharedPaymentId } });
  await logActivity(tx, {
    actorUserId: contributor.contributorUserId ?? undefined,
    type: "SHARED_PAYMENT_CONTRIBUTION",
    message: `مساهمة ${formatMoney(amount, sp.currency)} في "${parent.title}"`,
    targetType: "SharedPayment",
    targetId: sharedPaymentId,
  });

  if (nextStatus === "FUNDED" && sp.status !== "FUNDED") {
    await notify(tx, {
      userId: parent.createdById,
      type: "SHARED_PAYMENT_COMPLETED",
      title: "اكتملت القِطّة 🎉",
      body: `تم جمع كامل مبلغ "${parent.title}"`,
      data: { sharedPaymentId },
    });
  } else {
    await notify(tx, {
      userId: parent.createdById,
      type: "SHARED_PAYMENT_PROGRESS",
      title: "مساهمة جديدة",
      body: `تمت إضافة ${formatMoney(amount, sp.currency)} إلى "${parent.title}"`,
      data: { sharedPaymentId },
    });
  }
}
