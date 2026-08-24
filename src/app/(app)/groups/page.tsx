import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users2 } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listMyGroups } from "@/server/groups/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { MoneyText } from "@/components/money-text";
import { GROUP_TYPE_LABELS_AR } from "@/lib/labels";

export const metadata: Metadata = { title: "مجموعاتي" };

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await listMyGroups(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">مجموعاتي</h1>
        <Button asChild size="sm">
          <Link href="/groups/new">
            <Plus className="h-4 w-4" /> مجموعة جديدة
          </Link>
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="ما عندك أي مجموعة بعد"
          description="ابدأ أول قِطّة مع أصحابك — رحلة، سكن، أو أي مناسبة."
          action={
            <Button asChild size="sm">
              <Link href="/groups/new">
                <Plus className="h-4 w-4" /> إنشاء مجموعة
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map(({ group, memberCount, netBalance }) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="p-4 transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{group.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {GROUP_TYPE_LABELS_AR[group.type]}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{memberCount} أعضاء</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{netBalance >= 0 ? "لك" : "عليك"}</span>
                  <MoneyText amountMinor={Math.abs(netBalance)} currency={group.currency} className="font-bold" sign={false} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
