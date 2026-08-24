import "server-only";
import { db } from "@/lib/db";
import { getGroupBalances } from "@/server/ledger/ledger";

export async function listMyGroups(userId: string) {
  const memberships = await db.groupMember.findMany({
    where: { userId, status: "ACTIVE", group: { isArchived: false } },
    include: {
      group: {
        include: { _count: { select: { members: { where: { status: "ACTIVE" } }, expenses: true } } },
      },
    },
    orderBy: { group: { updatedAt: "desc" } },
  });

  const results = await Promise.all(
    memberships.map(async (m) => {
      const myBalance = await db.ledgerEntry.aggregate({
        where: { groupMemberId: m.id },
        _sum: { amount: true },
      });
      return {
        group: m.group,
        role: m.role,
        memberId: m.id,
        memberCount: m.group._count.members,
        expenseCount: m.group._count.expenses,
        netBalance: myBalance._sum.amount ?? 0,
      };
    }),
  );

  return results;
}

export async function getGroupDetail(groupId: string, userId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: { status: "ACTIVE" },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!group) return null;

  const myMembership = group.members.find((m) => m.userId === userId);
  if (!myMembership) return null;

  const balances = await getGroupBalances(groupId);
  const balanceMap = new Map(balances.map((b) => [b.groupMemberId, b.netMinor]));

  const membersWithBalance = group.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user?.name ?? m.guestName ?? "ضيف",
    avatarUrl: m.user?.avatarUrl ?? null,
    isGuest: !m.userId,
    role: m.role,
    netBalance: balanceMap.get(m.id) ?? 0,
  }));

  return {
    group,
    myMembership,
    members: membersWithBalance,
  };
}

export async function getRecentExpenses(groupId: string, limit = 20) {
  return db.expense.findMany({
    where: { groupId, status: "ACTIVE" },
    include: {
      category: true,
      payers: { include: { groupMember: { include: { user: true } } } },
      participants: { include: { groupMember: { include: { user: true } } } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });
}
