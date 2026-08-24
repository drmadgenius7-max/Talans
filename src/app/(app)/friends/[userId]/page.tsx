import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getFriendNetBalance } from "@/server/friends/balance";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoneyText } from "@/components/money-text";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "العلاقة المالية" };

export default async function FriendDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await requireUser();
  const friend = await db.user.findUnique({ where: { id: userId } });
  if (!friend) notFound();

  const [balance, sharedGroups] = await Promise.all([
    getFriendNetBalance(me.id, userId, me.defaultCurrency),
    db.groupMember.findMany({
      where: { userId: me.id, status: "ACTIVE", group: { members: { some: { userId, status: "ACTIVE" } } } },
      select: { groupId: true, group: { select: { name: true } } },
    }),
  ]);

  const groupIds = sharedGroups.map((g) => g.groupId);

  const [expenses, requests, settlements] = await Promise.all([
    db.expense.findMany({
      where: { groupId: { in: groupIds }, status: "ACTIVE" },
      include: { payers: { include: { groupMember: true } } },
      orderBy: { date: "desc" },
      take: 15,
    }),
    db.paymentRequest.findMany({
      where: {
        OR: [
          { requesterId: me.id, payerUserId: userId },
          { requesterId: userId, payerUserId: me.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    db.settlement.findMany({
      where: { groupId: { in: groupIds } },
      include: { fromMember: true, toMember: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const relevantSettlements = settlements.filter(
    (s) => (s.fromMember.userId === me.id && s.toMember.userId === userId) || (s.fromMember.userId === userId && s.toMember.userId === me.id),
  );

  type TimelineItem = { id: string; date: Date; label: string; amount: number; currency: string };
  const timeline: TimelineItem[] = [
    ...expenses.map((e) => ({ id: e.id, date: e.date, label: `مصروف: ${e.title}`, amount: e.amount, currency: e.currency })),
    ...requests.map((r) => ({ id: r.id, date: r.createdAt, label: `مطالبة: ${r.reason} (${r.status})`, amount: r.amount, currency: r.currency })),
    ...relevantSettlements.map((s) => ({ id: s.id, date: s.createdAt, label: `تسوية حساب`, amount: s.amount, currency: s.currency })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={friend.avatarUrl ?? undefined} />
          <AvatarFallback className="text-lg">{friend.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold">{friend.name}</h1>
          <p className="text-sm text-muted-foreground">
            {balance === 0 ? "متعادلون" : balance > 0 ? "لك عليه" : "عليك له"}{" "}
            {balance !== 0 && <MoneyText amountMinor={Math.abs(balance)} currency={me.defaultCurrency} className="font-bold" />}
          </p>
        </div>
      </div>

      <Button asChild size="sm">
        <Link href={`/payment-requests/new?payerUserId=${userId}`}>
          <UserPlus className="h-4 w-4" /> طالبه بمبلغ
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="font-bold">السجل المالي</p>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد سجل مشترك بعد.</p>
          ) : (
            timeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
                <div>
                  <p>{item.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                </div>
                <MoneyText amountMinor={item.amount} currency={item.currency} className="font-semibold" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
