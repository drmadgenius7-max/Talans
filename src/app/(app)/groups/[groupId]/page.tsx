import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { getGroupDetail, getRecentExpenses } from "@/server/groups/queries";
import { db } from "@/lib/db";
import { roleHasPermission } from "@/server/groups/permissions";
import { Badge } from "@/components/ui/badge";
import { GROUP_TYPE_LABELS_AR } from "@/lib/labels";
import { GroupTabsClient } from "@/components/groups/group-tabs-client";
import { GroupOverview } from "@/components/groups/group-overview";
import { GroupExpensesList } from "@/components/groups/group-expenses-list";
import { GroupMembersList } from "@/components/groups/group-members-list";
import { GroupActivityFeed } from "@/components/groups/group-activity-feed";
import { ClaimGuestBanner } from "@/components/groups/claim-guest-banner";

export async function generateMetadata({ params }: { params: Promise<{ groupId: string }> }): Promise<Metadata> {
  const { groupId } = await params;
  const group = await db.group.findUnique({ where: { id: groupId }, select: { name: true } });
  return { title: group?.name ?? "مجموعة" };
}

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();
  const detail = await getGroupDetail(groupId, user.id);
  if (!detail) notFound();

  const { group, myMembership, members } = detail;
  const [expenses, activities, claimableGuest] = await Promise.all([
    getRecentExpenses(groupId),
    db.activityLog.findMany({ where: { groupId }, orderBy: { createdAt: "desc" }, take: 30 }),
    user.phone || user.email
      ? db.groupMember.findFirst({
          where: {
            groupId,
            userId: null,
            status: "ACTIVE",
            OR: [
              user.phone ? { guestPhone: user.phone } : undefined,
              user.email ? { guestEmail: user.email } : undefined,
            ].filter(Boolean) as object[],
          },
        })
      : null,
  ]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const canManage = roleHasPermission(myMembership.role, "MANAGE_MEMBERS");
  const canSettle = roleHasPermission(myMembership.role, "SETTLE");

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <Badge variant="secondary">{GROUP_TYPE_LABELS_AR[group.type]}</Badge>
        </div>
        {group.description && <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>}
      </div>

      {claimableGuest && (
        <ClaimGuestBanner guestMemberId={claimableGuest.id} guestName={claimableGuest.guestName ?? "ضيف"} />
      )}

      <GroupTabsClient
        overview={
          <GroupOverview
            groupId={group.id}
            currency={group.currency}
            members={members}
            totalExpenses={totalExpenses}
            expenseCount={expenses.length}
            canSettle={canSettle}
          />
        }
        expenses={<GroupExpensesList groupId={group.id} expenses={expenses} />}
        members={<GroupMembersList groupId={group.id} members={members} canManage={canManage} />}
        activity={<GroupActivityFeed activities={activities} />}
      />
    </div>
  );
}
