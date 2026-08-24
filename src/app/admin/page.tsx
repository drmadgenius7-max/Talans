import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "لوحة التحكم" };

export default async function AdminOverviewPage() {
  const [users, groups, expenses, paymentRequests, sharedPayments, transactions, transactionsSucceeded, refunds] = await Promise.all([
    db.user.count({ where: { status: "ACTIVE" } }),
    db.group.count(),
    db.expense.count({ where: { status: "ACTIVE" } }),
    db.paymentRequest.count(),
    db.sharedPayment.count(),
    db.transaction.count(),
    db.transaction.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amount: true } }),
    db.refund.count(),
  ]);

  const stats = [
    { label: "المستخدمون النشطون", value: users },
    { label: "المجموعات", value: groups },
    { label: "المصاريف", value: expenses },
    { label: "المطالبات", value: paymentRequests },
    { label: "عمليات الدفع التشاركي", value: sharedPayments },
    { label: "إجمالي المعاملات", value: transactions },
    { label: "حجم المعاملات الناجحة (هللة)", value: transactionsSucceeded._sum.amount ?? 0 },
    { label: "الاستردادات", value: refunds },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">نظرة عامة</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-black">{s.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        وضع الدفع الحالي: <b>Mock</b> — جميع المعاملات محاكاة ولا تمثل أموالًا حقيقية.
      </p>
    </div>
  );
}
