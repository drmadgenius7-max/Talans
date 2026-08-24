import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MoneyText } from "@/components/money-text";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "بحث" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: {
    groups: { id: string; name: string }[];
    expenses: { id: string; title: string; amount: number; currency: string; groupId: string }[];
    requests: { id: string; reason: string; amount: number; currency: string; secureToken: string }[];
    sharedPayments: { id: string; title: string; targetAmount: number; currency: string; secureToken: string }[];
    people: { id: string; name: string }[];
  } = { groups: [], expenses: [], requests: [], sharedPayments: [], people: [] };

  if (query.length >= 2) {
    const myGroupIds = (await db.groupMember.findMany({ where: { userId: user.id, status: "ACTIVE" }, select: { groupId: true } })).map(
      (g) => g.groupId,
    );

    const [groups, expenses, requests, sharedPayments, members] = await Promise.all([
      db.group.findMany({ where: { id: { in: myGroupIds }, name: { contains: query, mode: "insensitive" } }, take: 10 }),
      db.expense.findMany({
        where: { groupId: { in: myGroupIds }, title: { contains: query, mode: "insensitive" }, status: "ACTIVE" },
        take: 10,
      }),
      db.paymentRequest.findMany({
        where: { OR: [{ requesterId: user.id }, { payerUserId: user.id }], reason: { contains: query, mode: "insensitive" } },
        take: 10,
      }),
      db.sharedPayment.findMany({
        where: { OR: [{ createdById: user.id }, { participants: { some: { userId: user.id } } }], title: { contains: query, mode: "insensitive" } },
        take: 10,
      }),
      db.groupMember.findMany({
        where: { groupId: { in: myGroupIds }, status: "ACTIVE", user: { name: { contains: query, mode: "insensitive" } } },
        include: { user: true },
        distinct: ["userId"],
        take: 10,
      }),
    ]);

    results = {
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
      expenses: expenses.map((e) => ({ id: e.id, title: e.title, amount: e.amount, currency: e.currency, groupId: e.groupId })),
      requests: requests.map((r) => ({ id: r.id, reason: r.reason, amount: r.amount, currency: r.currency, secureToken: r.secureToken })),
      sharedPayments: sharedPayments.map((s) => ({ id: s.id, title: s.title, targetAmount: s.targetAmount, currency: s.currency, secureToken: s.secureToken })),
      people: members.filter((m) => m.user).map((m) => ({ id: m.user!.id, name: m.user!.name })),
    };
  }

  const hasAny = query.length >= 2 && Object.values(results).some((r) => r.length > 0);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <form>
        <div className="relative">
          <SearchIcon className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={query} placeholder="ابحث عن مجموعة، مصروف، شخص..." className="ps-10" autoFocus />
        </div>
      </form>

      {query.length < 2 ? (
        <p className="text-center text-sm text-muted-foreground">اكتب حرفين على الأقل للبحث</p>
      ) : !hasAny ? (
        <EmptyState icon={SearchIcon} title="ما لقينا نتائج" description={`لا يوجد نتائج لـ "${query}"`} />
      ) : (
        <div className="space-y-5">
          {results.groups.length > 0 && (
            <ResultSection title="المجموعات">
              {results.groups.map((g) => (
                <Link key={g.id} href={`/groups/${g.id}`}>
                  <Card className="p-3 text-sm font-medium">{g.name}</Card>
                </Link>
              ))}
            </ResultSection>
          )}
          {results.people.length > 0 && (
            <ResultSection title="الأشخاص">
              {results.people.map((p) => (
                <Link key={p.id} href={`/friends/${p.id}`}>
                  <Card className="p-3 text-sm font-medium">{p.name}</Card>
                </Link>
              ))}
            </ResultSection>
          )}
          {results.expenses.length > 0 && (
            <ResultSection title="المصاريف">
              {results.expenses.map((e) => (
                <Link key={e.id} href={`/groups/${e.groupId}`}>
                  <Card className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium">{e.title}</span>
                    <MoneyText amountMinor={e.amount} currency={e.currency} className="font-semibold" />
                  </Card>
                </Link>
              ))}
            </ResultSection>
          )}
          {results.requests.length > 0 && (
            <ResultSection title="المطالبات">
              {results.requests.map((r) => (
                <Link key={r.id} href={`/pay/${r.secureToken}`}>
                  <Card className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium">{r.reason}</span>
                    <MoneyText amountMinor={r.amount} currency={r.currency} className="font-semibold" />
                  </Card>
                </Link>
              ))}
            </ResultSection>
          )}
          {results.sharedPayments.length > 0 && (
            <ResultSection title="الدفع التشاركي">
              {results.sharedPayments.map((s) => (
                <Link key={s.id} href={`/qitta/${s.secureToken}`}>
                  <Card className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium">{s.title}</span>
                    <MoneyText amountMinor={s.targetAmount} currency={s.currency} className="font-semibold" />
                  </Card>
                </Link>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-muted-foreground">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
