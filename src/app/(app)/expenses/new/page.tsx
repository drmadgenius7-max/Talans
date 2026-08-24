import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import { db } from "@/lib/db";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "إضافة مصروف" };

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; groupId?: string }>;
}) {
  const user = await requireUser();
  const { mode, groupId } = await searchParams;
  const isPaidForThem = mode === "paid_for_them";

  const [memberships, categories] = await Promise.all([
    db.groupMember.findMany({
      where: { userId: user.id, status: "ACTIVE", group: { isArchived: false } },
      include: {
        group: {
          include: {
            members: {
              where: { status: "ACTIVE" },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
      orderBy: { group: { updatedAt: "desc" } },
    }),
    db.category.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    currency: m.group.currency,
    myMemberId: m.id,
    members: m.group.members.map((gm) => ({
      id: gm.id,
      userId: gm.userId,
      name: gm.user?.name ?? gm.guestName ?? "ضيف",
      avatarUrl: gm.user?.avatarUrl ?? null,
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isPaidForThem ? "دفعت عنهم" : "إضافة مصروف"}</CardTitle>
          <CardDescription>
            {isPaidForThem
              ? "قسّم الفاتورة على أصحابك وارسل لهم مطالبات تلقائيًا"
              : "سجّل مصروف وقسّمه على المجموعة"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لازم يكون عندك مجموعة أولًا. <Link href="/groups/new" className="text-primary underline">أنشئ مجموعة</Link>
            </p>
          ) : (
            <ExpenseForm
              groups={groups}
              categories={categories.map((c) => ({ id: c.id, label: `${c.icon} ${c.nameAr}` }))}
              initialGroupId={groupId}
              paidForThemMode={isPaidForThem}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
