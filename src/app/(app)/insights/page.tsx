import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { getInsightsData } from "@/server/analytics/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyText } from "@/components/money-text";
import { MonthlyTrendChart, CategoryPieChart } from "@/components/insights/insights-charts";

export const metadata: Metadata = { title: "الإحصائيات" };

export default async function InsightsPage() {
  const user = await requireUser();
  const data = await getInsightsData(user.id, user.defaultCurrency);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">الإحصائيات</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="مصاريف هذا الشهر" amount={data.thisMonthTotal} currency={user.defaultCurrency} />
        <StatCard label="دفعته للآخرين" amount={data.paidToOthers} currency={user.defaultCurrency} />
        <StatCard label="مبلغ عليك" amount={data.outstandingYouOwe} currency={user.defaultCurrency} tone="destructive" />
        <StatCard label="مبلغ لك" amount={data.pendingOwedToYou} currency={user.defaultCurrency} tone="success" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اتجاه المصاريف الشهري</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات كافية بعد</p>
            ) : (
              <MonthlyTrendChart data={data.monthlyTrend} currency={user.defaultCurrency} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">المصاريف حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryBreakdown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات كافية بعد</p>
            ) : (
              <CategoryPieChart data={data.categoryBreakdown} currency={user.defaultCurrency} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أكثر مجموعة صرفًا</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات كافية بعد</p>
          ) : (
            data.topGroups.map((g) => (
              <div key={g.label} className="flex items-center justify-between text-sm">
                <span>{g.label}</span>
                <MoneyText amountMinor={g.amount} currency={user.defaultCurrency} className="font-bold" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, amount, currency, tone }: { label: string; amount: number; currency: string; tone?: "destructive" | "success" }) {
  return (
    <Card className="p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-black ${tone === "destructive" ? "text-destructive" : tone === "success" ? "text-success" : ""}`}>
        <MoneyText amountMinor={amount} currency={currency} />
      </p>
    </Card>
  );
}
