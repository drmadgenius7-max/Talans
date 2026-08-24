"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import { requireMembership } from "@/server/groups/actions";
import { assertPermission } from "@/server/groups/permissions";
import { getGroupBalances, recordSettlementLedger } from "@/server/ledger/ledger";
import { simplifyDebts, type SettlementTransfer } from "./debt-simplification";
import { generateSecureToken } from "@/lib/tokens";
import { notify, logActivity } from "@/server/notifications/notify";
import { formatMoney } from "@/lib/money";
import type { ActionResult } from "@/server/auth/actions";
import type { SettlementMethod } from "@prisma/client";

export interface SettlementPlanItem extends SettlementTransfer {
  fromName: string;
  toName: string;
  toUserId: string | null;
}

export async function getSettlementPlan(groupId: string): Promise<{ plan: SettlementPlanItem[]; currency: string; fullySettled: boolean }> {
  const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
  const members = await db.groupMember.findMany({ where: { groupId, status: "ACTIVE" }, include: { user: true } });
  const memberById = new Map(members.map((m) => [m.id, m]));

  const balances = await getGroupBalances(groupId);
  const transfers = simplifyDebts(balances.map((b) => ({ memberId: b.groupMemberId, netMinor: b.netMinor })));

  const plan = transfers.map((t) => {
    const from = memberById.get(t.fromMemberId);
    const to = memberById.get(t.toMemberId);
    return {
      ...t,
      fromName: from?.user?.name ?? from?.guestName ?? "عضو",
      toName: to?.user?.name ?? to?.guestName ?? "عضو",
      toUserId: to?.userId ?? null,
    };
  });

  return { plan, currency: group.currency, fullySettled: transfers.length === 0 };
}

export async function createRequestFromTransferAction(
  groupId: string,
  fromMemberId: string,
  toMemberId: string,
): Promise<ActionResult & { token?: string }> {
  const user = await requireUser();
  const member = await requireMembership(groupId, user.id);
  assertPermission(member.role, "SETTLE");

  const [fromMember, toMember] = await Promise.all([
    db.groupMember.findUniqueOrThrow({ where: { id: fromMemberId } }),
    db.groupMember.findUniqueOrThrow({ where: { id: toMemberId } }),
  ]);
  if (!toMember.userId) return { success: false, error: "لا يمكن إرسال مطالبة لشخص بدون حساب" };

  const { plan, currency } = await getSettlementPlan(groupId);
  const item = plan.find((p) => p.fromMemberId === fromMemberId && p.toMemberId === toMemberId);
  if (!item) return { success: false, error: "لا توجد تسوية معلّقة بين هذين العضوين" };

  const token = generateSecureToken(24);
  const request = await db.paymentRequest.create({
    data: {
      groupId,
      requesterId: toMember.userId,
      requesterMemberId: toMember.id,
      payerUserId: fromMember.userId,
      payerMemberId: fromMember.id,
      payerGuestName: fromMember.userId ? null : fromMember.guestName,
      payerGuestPhone: fromMember.userId ? null : fromMember.guestPhone,
      amount: item.amountMinor,
      currency,
      reason: "تسوية حساب",
      secureToken: token,
      status: "PENDING",
    },
  });

  if (fromMember.userId) {
    await notify(db, {
      userId: fromMember.userId,
      type: "PAYMENT_REQUEST_CREATED",
      title: "مطالبة تسوية",
      body: `${item.toName} يطالبك بـ ${formatMoney(item.amountMinor, currency)} لتسوية الحساب`,
      data: { groupId, paymentRequestId: request.id },
    });
  }

  revalidatePath(`/groups/${groupId}/settle`);
  return { success: true, token };
}

export async function recordManualSettlementAction(input: {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  method: SettlementMethod;
  note?: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const member = await requireMembership(input.groupId, user.id);
  assertPermission(member.role, "SETTLE");

  const group = await db.group.findUniqueOrThrow({ where: { id: input.groupId } });
  const amountMinor = Math.round(input.amount * 100);

  await db.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        groupId: input.groupId,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        amount: amountMinor,
        currency: group.currency,
        method: input.method,
        status: "COMPLETED",
        note: input.note || null,
        recordedById: user.id,
        settledAt: new Date(),
      },
    });

    await recordSettlementLedger(tx, {
      groupId: input.groupId,
      fromMemberId: input.fromMemberId,
      toMemberId: input.toMemberId,
      amount: amountMinor,
      currency: group.currency,
      settlementId: settlement.id,
    });

    await logActivity(tx, {
      groupId: input.groupId,
      actorUserId: user.id,
      type: "SETTLEMENT_RECORDED",
      message: `${user.name} سجّل تسوية يدوية بقيمة ${formatMoney(amountMinor, group.currency)}`,
      targetType: "Settlement",
      targetId: settlement.id,
    });
  });

  revalidatePath(`/groups/${input.groupId}/settle`);
  revalidatePath(`/groups/${input.groupId}`);
  return { success: true };
}
