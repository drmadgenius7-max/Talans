import "server-only";
import { db } from "@/lib/db";

/**
 * Computes the exact net balance between two users: positive = friend owes
 * me, negative = I owe friend.
 *
 * Group expenses are stored per-member (payer credit / participant debit),
 * not pairwise, so a direct "who owes whom between exactly these two
 * people" figure is derived here via bipartite decomposition: each
 * expense's total paid is split proportionally across payers, and each
 * payer's proportional share of every participant's owed amount becomes a
 * pairwise credit. Payments and manual settlements are already pairwise in
 * the schema and are added directly.
 */
export async function getFriendNetBalance(meId: string, friendId: string, currency: string): Promise<number> {
  const sharedGroupIds = await getSharedGroupIds(meId, friendId);
  let net = 0;

  if (sharedGroupIds.length > 0) {
    const expenses = await db.expense.findMany({
      where: { groupId: { in: sharedGroupIds }, status: "ACTIVE", currency },
      include: {
        payers: { include: { groupMember: true } },
        participants: { include: { groupMember: true } },
      },
    });

    for (const expense of expenses) {
      const totalPaid = expense.payers.reduce((s, p) => s + p.amount, 0);
      if (totalPaid <= 0) continue;
      const myPaid = expense.payers.filter((p) => p.groupMember.userId === meId).reduce((s, p) => s + p.amount, 0);
      const friendPaid = expense.payers.filter((p) => p.groupMember.userId === friendId).reduce((s, p) => s + p.amount, 0);
      const myOwed = expense.participants.filter((p) => p.groupMember.userId === meId).reduce((s, p) => s + p.owedAmount, 0);
      const friendOwed = expense.participants.filter((p) => p.groupMember.userId === friendId).reduce((s, p) => s + p.owedAmount, 0);
      net += (myPaid / totalPaid) * friendOwed - (friendPaid / totalPaid) * myOwed;
    }

    const settlements = await db.settlement.findMany({
      where: { groupId: { in: sharedGroupIds }, status: "COMPLETED", currency },
      include: { fromMember: true, toMember: true },
    });
    for (const s of settlements) {
      if (s.fromMember.userId === meId && s.toMember.userId === friendId) net += s.amount;
      else if (s.fromMember.userId === friendId && s.toMember.userId === meId) net -= s.amount;
    }
  }

  const requests = await db.paymentRequest.findMany({
    where: {
      currency,
      status: { notIn: ["DRAFT", "CANCELLED", "FAILED"] },
      OR: [
        { requesterId: meId, payerUserId: friendId },
        { requesterId: friendId, payerUserId: meId },
      ],
    },
  });

  for (const r of requests) {
    if (r.expenseId) {
      // Already counted as an original obligation via the bipartite expense
      // math above — only the *paid* portion needs to move the needle here.
      if (r.requesterId === meId) net -= r.paidAmount;
      else net += r.paidAmount;
    } else {
      // Standalone claim: the outstanding balance IS the debt (no expense
      // ledger backs it).
      const outstanding = r.amount - r.paidAmount;
      if (r.requesterId === meId) net += outstanding;
      else net -= outstanding;
    }
  }

  return Math.round(net);
}

async function getSharedGroupIds(userIdA: string, userIdB: string): Promise<string[]> {
  const [aGroups, bGroups] = await Promise.all([
    db.groupMember.findMany({ where: { userId: userIdA, status: "ACTIVE" }, select: { groupId: true } }),
    db.groupMember.findMany({ where: { userId: userIdB, status: "ACTIVE" }, select: { groupId: true } }),
  ]);
  const bSet = new Set(bGroups.map((g) => g.groupId));
  return aGroups.map((g) => g.groupId).filter((id) => bSet.has(id));
}
