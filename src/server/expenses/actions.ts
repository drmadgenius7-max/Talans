"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/session";
import { requireMembership } from "@/server/groups/actions";
import { assertPermission, roleHasPermission } from "@/server/groups/permissions";
import { toMinorUnits, addMoney } from "@/lib/money";
import {
  equalSplit,
  exactSplit,
  percentageSplit,
  sharesSplit,
  itemizedSplit,
  distributeAdjustment,
  sumMap,
  SplitValidationError,
} from "@/server/split/split-engine";
import { recordExpenseLedger, reverseExpenseLedger } from "@/server/ledger/ledger";
import { logActivity, notify } from "@/server/notifications/notify";
import { generateSecureToken } from "@/lib/tokens";
import { createExpenseSchema } from "@/lib/validation/expenses";
import type { ActionResult } from "@/server/auth/actions";

export interface GeneratedPaymentRequest {
  token: string;
  debtorName: string;
  amount: number;
}

export async function createExpenseAction(
  input: unknown,
): Promise<ActionResult & { expenseId?: string; currency?: string; generatedRequests?: GeneratedPaymentRequest[] }> {
  const user = await requireUser();
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const data = parsed.data;

  const member = await requireMembership(data.groupId, user.id).catch(() => null);
  if (!member) return { success: false, error: "لست عضوًا في هذه المجموعة" };
  if (!roleHasPermission(member.role, "ADD_EXPENSE")) return { success: false, error: "ليس لديك صلاحية إضافة مصروف" };

  const group = await db.group.findUniqueOrThrow({ where: { id: data.groupId } });
  const groupMembers = await db.groupMember.findMany({
    where: { groupId: data.groupId, status: "ACTIVE" },
    include: { user: { select: { name: true } } },
  });
  const validMemberIds = new Set(groupMembers.map((m) => m.id));

  for (const p of data.payers) {
    if (!validMemberIds.has(p.groupMemberId)) return { success: false, error: "أحد الدافعين ليس عضوًا في المجموعة" };
  }
  for (const id of data.participantIds) {
    if (!validMemberIds.has(id)) return { success: false, error: "أحد المشاركين ليس عضوًا في المجموعة" };
  }

  let baseOwed: Map<string, number>;
  let baseTotalMinor: number;

  try {
    if (data.splitType === "ITEMIZED") {
      if (!data.items || data.items.length === 0) throw new SplitValidationError("أضف عناصر الفاتورة");
      const items = data.items.map((item, i) => ({
        itemId: String(i),
        amountMinor: toMinorUnits(item.amount, group.currency),
        participantIds: item.participantIds,
      }));
      baseOwed = itemizedSplit(items);
      baseTotalMinor = sumMap(baseOwed);
    } else {
      baseTotalMinor = toMinorUnits(data.amount, group.currency);
      switch (data.splitType) {
        case "EQUAL":
          baseOwed = equalSplit(baseTotalMinor, data.participantIds);
          break;
        case "EXACT": {
          const entries = data.participantIds.map((id) => ({
            participantId: id,
            amountMinor: toMinorUnits(data.exactAmounts?.[id] ?? 0, group.currency),
          }));
          baseOwed = exactSplit(entries, baseTotalMinor);
          break;
        }
        case "PERCENTAGE": {
          const entries = data.participantIds.map((id) => ({
            participantId: id,
            percentage: data.percentages?.[id] ?? 0,
          }));
          baseOwed = percentageSplit(baseTotalMinor, entries);
          break;
        }
        case "SHARES": {
          const entries = data.participantIds.map((id) => ({
            participantId: id,
            shares: data.shares?.[id] ?? 0,
          }));
          baseOwed = sharesSplit(baseTotalMinor, entries);
          break;
        }
        default:
          throw new SplitValidationError("طريقة تقسيم غير معروفة");
      }
    }

    let finalOwed = baseOwed;
    for (const adj of data.adjustments) {
      const adjMinor = toMinorUnits(adj.amount, group.currency);
      finalOwed = distributeAdjustment(finalOwed, adj.isDiscount ? -adjMinor : adjMinor);
    }

    const finalTotalMinor = sumMap(finalOwed);
    const payersTotal = addMoney(...data.payers.map((p) => toMinorUnits(p.amount, group.currency)));
    if (payersTotal !== finalTotalMinor) {
      return {
        success: false,
        error: `مجموع ما دفعه الجميع (${payersTotal / 100}) لا يساوي إجمالي المصروف (${finalTotalMinor / 100})`,
      };
    }

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId: data.groupId,
          title: data.title,
          amount: finalTotalMinor,
          currency: group.currency,
          categoryId: data.categoryId || null,
          date: new Date(data.date),
          notes: data.notes || null,
          splitType: data.splitType,
          createdById: user.id,
          payers: {
            create: data.payers.map((p) => ({ groupMemberId: p.groupMemberId, amount: toMinorUnits(p.amount, group.currency) })),
          },
        },
      });

      const participantRows = await Promise.all(
        [...finalOwed.entries()].map(([groupMemberId, owedAmount]) =>
          tx.expenseParticipant.create({
            data: {
              expenseId: created.id,
              groupMemberId,
              owedAmount,
              shareValue:
                data.splitType === "PERCENTAGE"
                  ? Math.round((data.percentages?.[groupMemberId] ?? 0) * 100)
                  : data.splitType === "SHARES"
                    ? (data.shares?.[groupMemberId] ?? 0)
                    : null,
            },
          }),
        ),
      );
      const participantIdByMember = new Map(participantRows.map((r) => [r.groupMemberId, r.id]));

      if (data.splitType === "ITEMIZED" && data.items) {
        for (const item of data.items) {
          const createdItem = await tx.expenseItem.create({
            data: { expenseId: created.id, name: item.name, amount: toMinorUnits(item.amount, group.currency) },
          });
          for (const pid of item.participantIds) {
            const participantId = participantIdByMember.get(pid);
            if (participantId) {
              await tx.expenseItemAssignment.create({ data: { expenseItemId: createdItem.id, participantId } });
            }
          }
        }
      }

      if (data.adjustments.length > 0) {
        await tx.expenseAdjustment.createMany({
          data: data.adjustments.map((adj) => ({
            expenseId: created.id,
            type: adj.type,
            amount: toMinorUnits(adj.amount, group.currency),
            isPercentage: false,
            isDiscount: adj.isDiscount,
          })),
        });
      }

      if (data.attachmentFileIds.length > 0) {
        await tx.expenseAttachment.createMany({
          data: data.attachmentFileIds.map((fileId) => ({ expenseId: created.id, fileId })),
        });
      }

      await recordExpenseLedger(tx, {
        id: created.id,
        groupId: data.groupId,
        currency: group.currency,
        title: data.title,
        payers: data.payers.map((p) => ({ groupMemberId: p.groupMemberId, amount: toMinorUnits(p.amount, group.currency) })),
        participants: [...finalOwed.entries()].map(([groupMemberId, owedAmount]) => ({ groupMemberId, owedAmount })),
      });

      await logActivity(tx, {
        groupId: data.groupId,
        actorUserId: user.id,
        type: "EXPENSE_ADDED",
        message: `${user.name} أضاف مصروف "${data.title}" بقيمة ${(finalTotalMinor / 100).toFixed(2)} ${group.currency}`,
        targetType: "Expense",
        targetId: created.id,
      });

      // Notify every participant with a linked account except the actor.
      const memberById = new Map(groupMembers.map((m) => [m.id, m]));
      for (const [groupMemberId] of finalOwed) {
        const gm = memberById.get(groupMemberId);
        if (gm?.userId && gm.userId !== user.id) {
          await notify(tx, {
            userId: gm.userId,
            type: "EXPENSE_ADDED",
            title: "مصروف جديد",
            body: `${user.name} أضاف مصروف "${data.title}" في ${group.name}`,
            data: { groupId: data.groupId, expenseId: created.id },
          });
        }
      }

      // "دفعت عنهم" convenience: auto-generate payment requests when a
      // single payer covered participants other than themselves.
      const generatedRequests: { token: string; debtorName: string; amount: number }[] = [];
      if (data.autoCreatePaymentRequests && data.payers.length === 1) {
        const expensePayerMemberId = data.payers[0]!.groupMemberId;
        const payerMember = memberById.get(expensePayerMemberId);
        if (payerMember) {
          for (const [groupMemberId, owedAmount] of finalOwed) {
            if (groupMemberId === expensePayerMemberId || owedAmount <= 0) continue;
            const debtor = memberById.get(groupMemberId);
            if (!debtor) continue;
            const token = generateSecureToken(24);
            await tx.paymentRequest.create({
              data: {
                groupId: data.groupId,
                expenseId: created.id,
                requesterId: user.id,
                requesterMemberId: payerMember.id,
                payerUserId: debtor.userId,
                payerMemberId: debtor.id,
                payerGuestName: debtor.userId ? null : debtor.guestName,
                payerGuestPhone: debtor.userId ? null : debtor.guestPhone,
                amount: owedAmount,
                currency: group.currency,
                reason: data.title,
                secureToken: token,
                status: "PENDING",
              },
            });
            generatedRequests.push({ token, debtorName: debtor.user?.name ?? debtor.guestName ?? "عضو", amount: owedAmount });
            if (debtor.userId) {
              await notify(tx, {
                userId: debtor.userId,
                type: "PAYMENT_REQUEST_CREATED",
                title: "مطالبة جديدة",
                body: `${user.name} يطالبك بـ ${(owedAmount / 100).toFixed(2)} ${group.currency} عن "${data.title}"`,
                data: { groupId: data.groupId, expenseId: created.id },
              });
            }
          }
        }
      }

      return { expense: created, generatedRequests };
    });

    revalidatePath(`/groups/${data.groupId}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      expenseId: expense.expense.id,
      currency: group.currency,
      generatedRequests: expense.generatedRequests,
    };
  } catch (err) {
    if (err instanceof SplitValidationError) return { success: false, error: err.message };
    throw err;
  }
}

export async function voidExpenseAction(expenseId: string): Promise<ActionResult> {
  const user = await requireUser();
  const expense = await db.expense.findUniqueOrThrow({ where: { id: expenseId } });
  const member = await requireMembership(expense.groupId, user.id);
  assertPermission(member.role, "DELETE_EXPENSE");

  if (expense.status === "VOIDED") return { success: true };

  await db.$transaction(async (tx) => {
    await reverseExpenseLedger(tx, expenseId);
    await tx.expense.update({ where: { id: expenseId }, data: { status: "VOIDED", voidedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        entityType: "Expense",
        entityId: expenseId,
        action: "VOID",
        actorUserId: user.id,
        oldValue: { status: expense.status, amount: expense.amount },
        newValue: { status: "VOIDED" },
      },
    });
    await logActivity(tx, {
      groupId: expense.groupId,
      actorUserId: user.id,
      type: "EXPENSE_VOIDED",
      message: `${user.name} ألغى مصروف "${expense.title}"`,
      targetType: "Expense",
      targetId: expenseId,
    });
  });

  revalidatePath(`/groups/${expense.groupId}`);
  return { success: true };
}
