import "server-only";
import { db } from "@/lib/db";

/** People the user shares at least one group with — used as the "pick a
 * person" list for standalone payment requests and quick actions. */
export async function listKnownUsers(userId: string) {
  const myGroupIds = await db.groupMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { groupId: true },
  });
  const groupIds = myGroupIds.map((g) => g.groupId);
  if (groupIds.length === 0) return [];

  const members = await db.groupMember.findMany({
    where: { groupId: { in: groupIds }, status: "ACTIVE", userId: { not: userId } },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    distinct: ["userId"],
  });

  return members
    .filter((m) => m.user)
    .map((m) => ({ id: m.user!.id, name: m.user!.name, avatarUrl: m.user!.avatarUrl }));
}
