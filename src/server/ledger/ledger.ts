/**
 * Ledger — the single source of truth for "who owes whom" inside a group.
 *
 * LedgerEntry rows are append-only. A member's balance in a group is always
 * SUM(amount) over their entries: positive = owed to them, negative = they
 * owe. Corrections (voiding an expense, reversing a settlement) are made by
 * inserting offsetting ADJUSTMENT rows, never by mutating history.
 *
 * Shared Payments (crowdfunding) deliberately do NOT touch this ledger —
 * contributing to a shared goal is not a debt between participants, it's a
 * separate concern (see src/server/shared-payments).
 */
import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient | PrismaClient;

export interface LedgerLine {
  groupId: string;
  groupMemberId: string;
  type: "EXPENSE" | "OBLIGATION" | "PAYMENT" | "SETTLEMENT" | "ADJUSTMENT";
  amount: number;
  currency: string;
  description: string;
  expenseId?: string;
  paymentRequestId?: string;
  transactionId?: string;
  settlementId?: string;
}

export async function writeLedgerLines(tx: Tx, lines: LedgerLine[]): Promise<void> {
  if (lines.length === 0) return;
  await tx.ledgerEntry.createMany({
    data: lines.map((l) => ({
      groupId: l.groupId,
      groupMemberId: l.groupMemberId,
      type: l.type,
      amount: l.amount,
      currency: l.currency,
      description: l.description,
      expenseId: l.expenseId,
      paymentRequestId: l.paymentRequestId,
      transactionId: l.transactionId,
      settlementId: l.settlementId,
    })),
  });
}

/** Records the ledger effect of a newly created expense: payers get credited
 * what they paid, participants get debited their owed share. */
export async function recordExpenseLedger(
  tx: Tx,
  expense: {
    id: string;
    groupId: string;
    currency: string;
    title: string;
    payers: { groupMemberId: string; amount: number }[];
    participants: { groupMemberId: string; owedAmount: number }[];
  },
): Promise<void> {
  const lines: LedgerLine[] = [
    ...expense.payers.map((p) => ({
      groupId: expense.groupId,
      groupMemberId: p.groupMemberId,
      type: "EXPENSE" as const,
      amount: p.amount,
      currency: expense.currency,
      description: `دفع مصروف: ${expense.title}`,
      expenseId: expense.id,
    })),
    ...expense.participants.map((p) => ({
      groupId: expense.groupId,
      groupMemberId: p.groupMemberId,
      type: "OBLIGATION" as const,
      amount: -p.owedAmount,
      currency: expense.currency,
      description: `حصة من مصروف: ${expense.title}`,
      expenseId: expense.id,
    })),
  ];
  await writeLedgerLines(tx, lines);
}

/** Reverses an expense's ledger effect (used on void/delete). */
export async function reverseExpenseLedger(tx: Tx, expenseId: string): Promise<void> {
  const original = await tx.ledgerEntry.findMany({ where: { expenseId } });
  const lines: LedgerLine[] = original.map((e) => ({
    groupId: e.groupId!,
    groupMemberId: e.groupMemberId,
    type: "ADJUSTMENT",
    amount: -e.amount,
    currency: e.currency,
    description: `إلغاء: ${e.description}`,
    expenseId: e.expenseId ?? undefined,
  }));
  await writeLedgerLines(tx, lines);
}

/** Records a successful payment against a payment request: the payer's debt
 * shrinks (+amount), the requester is owed less (-amount). */
export async function recordPaymentRequestLedger(
  tx: Tx,
  args: {
    groupId: string;
    payerMemberId: string;
    requesterMemberId: string;
    amount: number;
    currency: string;
    reason: string;
    paymentRequestId: string;
    transactionId: string;
  },
): Promise<void> {
  await writeLedgerLines(tx, [
    {
      groupId: args.groupId,
      groupMemberId: args.payerMemberId,
      type: "PAYMENT",
      amount: args.amount,
      currency: args.currency,
      description: `دفعت: ${args.reason}`,
      paymentRequestId: args.paymentRequestId,
      transactionId: args.transactionId,
    },
    {
      groupId: args.groupId,
      groupMemberId: args.requesterMemberId,
      type: "PAYMENT",
      amount: -args.amount,
      currency: args.currency,
      description: `استلمت دفعة: ${args.reason}`,
      paymentRequestId: args.paymentRequestId,
      transactionId: args.transactionId,
    },
  ]);
}

/** Records a settlement (online or manual) between two group members. */
export async function recordSettlementLedger(
  tx: Tx,
  args: {
    groupId: string;
    fromMemberId: string;
    toMemberId: string;
    amount: number;
    currency: string;
    settlementId: string;
  },
): Promise<void> {
  await writeLedgerLines(tx, [
    {
      groupId: args.groupId,
      groupMemberId: args.fromMemberId,
      type: "SETTLEMENT",
      amount: args.amount,
      currency: args.currency,
      description: "تسوية حساب",
      settlementId: args.settlementId,
    },
    {
      groupId: args.groupId,
      groupMemberId: args.toMemberId,
      type: "SETTLEMENT",
      amount: -args.amount,
      currency: args.currency,
      description: "تسوية حساب",
      settlementId: args.settlementId,
    },
  ]);
}

export interface MemberBalance {
  groupMemberId: string;
  netMinor: number;
}

export async function getGroupBalances(groupId: string): Promise<MemberBalance[]> {
  const grouped = await db.ledgerEntry.groupBy({
    by: ["groupMemberId"],
    where: { groupId },
    _sum: { amount: true },
  });
  return grouped.map((g) => ({ groupMemberId: g.groupMemberId, netMinor: g._sum.amount ?? 0 }));
}

export async function getMemberBalance(groupMemberId: string): Promise<number> {
  const result = await db.ledgerEntry.aggregate({
    where: { groupMemberId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/** Cross-group summary for a user's dashboard: total owed to them, total
 * they owe, and net, aggregated across every group they belong to. */
export async function getUserFinancialSummary(userId: string, currency: string) {
  const memberships = await db.groupMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, group: { select: { currency: true } } },
  });
  const memberIds = memberships
    .filter((m) => m.group.currency === currency)
    .map((m) => m.id);

  if (memberIds.length === 0) {
    return { youAreOwed: 0, youOwe: 0, net: 0 };
  }

  const grouped = await db.ledgerEntry.groupBy({
    by: ["groupMemberId"],
    where: { groupMemberId: { in: memberIds } },
    _sum: { amount: true },
  });

  let youAreOwed = 0;
  let youOwe = 0;
  for (const g of grouped) {
    const net = g._sum.amount ?? 0;
    if (net > 0) youAreOwed += net;
    else youOwe += -net;
  }

  return { youAreOwed, youOwe, net: youAreOwed - youOwe };
}
