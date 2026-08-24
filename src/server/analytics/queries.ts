import "server-only";
import { db } from "@/lib/db";

export async function getInsightsData(userId: string, currency: string) {
  const myMemberships = await db.groupMember.findMany({ where: { userId, status: "ACTIVE" }, select: { id: true, groupId: true } });
  const memberIds = myMemberships.map((m) => m.id);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const participations = await db.expenseParticipant.findMany({
    where: { groupMemberId: { in: memberIds }, expense: { status: "ACTIVE", currency, date: { gte: sixMonthsAgo } } },
    include: { expense: { include: { category: true, group: true } } },
  });

  const monthly = new Map<string, number>();
  const byCategory = new Map<string, { label: string; amount: number }>();
  const byGroup = new Map<string, { label: string; amount: number }>();

  for (const p of participations) {
    const monthKey = `${p.expense.date.getFullYear()}-${String(p.expense.date.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(monthKey, (monthly.get(monthKey) ?? 0) + p.owedAmount);

    const catKey = p.expense.category?.nameAr ?? "أخرى";
    byCategory.set(catKey, { label: catKey, amount: (byCategory.get(catKey)?.amount ?? 0) + p.owedAmount });

    const groupKey = p.expense.group.name;
    byGroup.set(groupKey, { label: groupKey, amount: (byGroup.get(groupKey)?.amount ?? 0) + p.owedAmount });
  }

  const monthlyTrend = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount }));
  const categoryBreakdown = [...byCategory.values()].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const topGroups = [...byGroup.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const [paidToOthers, refundsReceived, outstanding, pendingOwedToMe, settledCount] = await Promise.all([
    db.transaction.aggregate({
      where: { purpose: "PAYMENT_REQUEST", status: "SUCCEEDED", currency, contributorUserId: userId },
      _sum: { amount: true },
    }),
    db.refund.aggregate({
      where: { status: "SUCCEEDED", transaction: { contributorUserId: userId, currency } },
      _sum: { amount: true },
    }),
    db.paymentRequest.aggregate({
      where: { payerUserId: userId, currency, status: { in: ["PENDING", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { amount: true, paidAmount: true },
    }),
    db.paymentRequest.aggregate({
      where: { requesterId: userId, currency, status: { in: ["PENDING", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { amount: true, paidAmount: true },
    }),
    db.settlement.count({ where: { groupId: { in: myMemberships.map((m) => m.groupId) }, status: "COMPLETED" } }),
  ]);

  const thisMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const thisMonthTotal = monthly.get(thisMonthKey) ?? 0;

  return {
    monthlyTrend,
    categoryBreakdown,
    topGroups,
    thisMonthTotal,
    paidToOthers: paidToOthers._sum.amount ?? 0,
    refundsReceived: refundsReceived._sum.amount ?? 0,
    outstandingYouOwe: (outstanding._sum.amount ?? 0) - (outstanding._sum.paidAmount ?? 0),
    pendingOwedToYou: (pendingOwedToMe._sum.amount ?? 0) - (pendingOwedToMe._sum.paidAmount ?? 0),
    settledCount,
  };
}
