import "server-only";
import { db } from "@/lib/db";

export async function getDashboardData(userId: string, _currency: string) {
  const [outgoingRequests, incomingRequests, sharedPayments, groupIds] = await Promise.all([
    db.paymentRequest.findMany({
      where: { requesterId: userId, status: { notIn: ["DRAFT", "CANCELLED"] } },
      include: { payerUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.paymentRequest.findMany({
      where: { payerUserId: userId, status: { notIn: ["DRAFT", "CANCELLED", "PAID"] } },
      include: { requester: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.sharedPayment.findMany({
      where: {
        OR: [{ createdById: userId }, { participants: { some: { userId } } }],
        status: { in: ["ACTIVE", "PARTIALLY_FUNDED", "FUNDED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { participants: true } } },
    }),
    db.groupMember.findMany({ where: { userId, status: "ACTIVE" }, select: { groupId: true } }),
  ]);

  const activity = await db.activityLog.findMany({
    where: { groupId: { in: groupIds.map((g) => g.groupId) } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return { outgoingRequests, incomingRequests, sharedPayments, activity };
}
