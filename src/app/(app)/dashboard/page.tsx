import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Sparkles, Receipt, UserPlus, Users2, Scale, ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getUserFinancialSummary } from "@/server/ledger/ledger";
import { getDashboardData } from "@/server/dashboard/queries";
import { listMyGroups } from "@/server/groups/queries";
import { runAutoReminders } from "@/server/reminders/auto-reminders";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoneyText } from "@/components/money-text";
import { EmptyState } from "@/components/empty-state";
import { GroupActivityFeed } from "@/components/groups/group-activity-feed";
import { PAYMENT_REQUEST_STATUS_LABELS_AR } from "@/lib/labels";

export const metadata: Metadata = { title: "الرئيسية" };

const quickActions = [
  { href: "/expenses/new?mode=paid_for_them", label: "دفعت عنهم", icon: HandCoins },
  { href: "/shared-payments/new", label: "دفع تشاركي", icon: Sparkles },
  { href: "/expenses/new?mode=general", label: "إضافة مصروف", icon: Receipt },
  { href: "/groups/new", label: "إنشاء مجموعة", icon: Users2 },
  { href: "/payment-requests/new", label: "مطالبة شخص", icon: UserPlus },
];

export default async function DashboardPage() {
  const user = await requireUser();
  await runAutoReminders(user.id);

  const [summary, dashboardData, groups] = await Promise.all([
    getUserFinancialSummary(user.id, user.defaultCurrency),
    getDashboardData(user.id, user.defaultCurrency),
    listMyGroups(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحبًا، {user.name.split(" ")[0]} 👋</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">لك</p>
          <p className="mt-1 text-lg font-black text-success">
            <MoneyText amountMinor={summary.youAreOwed} currency={user.defaultCurrency} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">عليك</p>
          <p className="mt-1 text-lg font-black text-destructive">
            <MoneyText amountMinor={summary.youOwe} currency={user.defaultCurrency} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">صافي رصيدك</p>
          <p className="mt-1 text-lg font-black">
            <MoneyText amountMinor={summary.net} currency={user.defaultCurrency} sign />
          </p>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold text-muted-foreground">إجراءات سريعة</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <a.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-semibold leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">مطالباتك</h2>
        </div>
        {dashboardData.outgoingRequests.length === 0 && dashboardData.incomingRequests.length === 0 ? (
          <EmptyState title="ما عندك أي مطالبات حاليًا 🎉" description="ابدأ أول قِطّة مع أصحابك." />
        ) : (
          <div className="space-y-2">
            {dashboardData.incomingRequests.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold">{r.requester.name} يطالبك</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                </div>
                <div className="text-end">
                  <MoneyText amountMinor={r.amount - r.paidAmount} currency={r.currency} className="font-bold" />
                  <Badge variant="secondary" className="block w-fit">
                    {PAYMENT_REQUEST_STATUS_LABELS_AR[r.status]}
                  </Badge>
                </div>
              </Card>
            ))}
            {dashboardData.outgoingRequests.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold">{r.payerUser?.name ?? r.payerGuestName}</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                </div>
                <div className="text-end">
                  <MoneyText amountMinor={r.amount} currency={r.currency} className="font-bold" />
                  <Badge variant={r.status === "PAID" ? "success" : r.status === "OVERDUE" ? "destructive" : "secondary"} className="block w-fit">
                    {PAYMENT_REQUEST_STATUS_LABELS_AR[r.status]}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {dashboardData.sharedPayments.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">الدفع التشاركي</h2>
          <div className="space-y-2">
            {dashboardData.sharedPayments.map((sp) => {
              const pct = sp.targetAmount > 0 ? Math.min(100, Math.round((sp.collectedAmount / sp.targetAmount) * 100)) : 0;
              return (
                <Link key={sp.id} href={`/qitta/${sp.secureToken}`}>
                  <Card className="p-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-bold">{sp.title}</p>
                      <span className="text-xs font-bold text-primary">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <MoneyText amountMinor={sp.collectedAmount} currency={sp.currency} /> / <MoneyText amountMinor={sp.targetAmount} currency={sp.currency} />
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">مجموعاتي</h2>
          <Link href="/groups" className="flex items-center gap-1 text-xs font-semibold text-primary">
            الكل <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
        {groups.length === 0 ? (
          <EmptyState icon={Users2} title="ابدأ أول قِطّة مع أصحابك" action={<Link href="/groups/new" className="text-sm font-semibold text-primary">إنشاء مجموعة</Link>} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.slice(0, 4).map(({ group, netBalance }) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="flex items-center justify-between p-3.5">
                  <span className="text-sm font-semibold">{group.name}</span>
                  <MoneyText amountMinor={Math.abs(netBalance)} currency={group.currency} className="text-sm font-bold" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">آخر النشاطات</h2>
          {groups.length > 0 && (
            <Link href={`/groups/${groups[0]!.group.id}/settle`} className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Scale className="h-3 w-3" /> تسوية سريعة
            </Link>
          )}
        </div>
        <GroupActivityFeed activities={dashboardData.activity} />
      </section>
    </div>
  );
}
