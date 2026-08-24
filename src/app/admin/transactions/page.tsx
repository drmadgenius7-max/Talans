import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/money-text";
import { formatDateTime } from "@/lib/time";
import { Th, Td, TableHead } from "@/components/admin/admin-table";

export const metadata: Metadata = { title: "المعاملات" };

const STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary" | "warning"> = {
  SUCCEEDED: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "secondary",
};

export default async function AdminTransactionsPage() {
  const transactions = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      contributorUser: { select: { name: true } },
      paymentRequest: { select: { reason: true, requester: { select: { name: true } } } },
      sharedPayment: { select: { title: true } },
      refunds: true,
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المعاملات (Mock Transactions)</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <Th>المعرّف</Th>
              <Th>المستخدم</Th>
              <Th>النوع</Th>
              <Th>الغرض</Th>
              <Th>المبلغ</Th>
              <Th>الحالة</Th>
              <Th>المزوّد</Th>
              <Th>مرجع المزوّد</Th>
              <Th>الاسترداد</Th>
              <Th>الإنشاء</Th>
            </tr>
          </TableHead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 align-top">
                <Td className="font-mono text-xs text-muted-foreground">{t.id.slice(0, 10)}…</Td>
                <Td>{t.contributorUser?.name ?? t.contributorGuestName ?? "—"}</Td>
                <Td>{t.type}</Td>
                <Td className="text-muted-foreground">{t.paymentRequest?.reason ?? t.sharedPayment?.title ?? "—"}</Td>
                <Td>
                  <MoneyText amountMinor={t.amount} currency={t.currency} className="font-semibold" />
                </Td>
                <Td>
                  <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>{t.status}</Badge>
                </Td>
                <Td>{t.provider}</Td>
                <Td className="font-mono text-xs text-muted-foreground">{t.providerRef ?? "—"}</Td>
                <Td>{t.refunds.length > 0 ? <Badge variant="secondary">{t.refunds[0]!.status}</Badge> : "—"}</Td>
                <Td className="text-muted-foreground">{formatDateTime(t.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">
        هذه بيانات مزوّد الدفع التجريبي (Mock) فقط — لا توجد أموال حقيقية متحركة. عند ربط بوابة دفع حقيقية ستظهر بنفس
        الشكل عبر واجهة الموفّر الموحدة.
      </p>
    </div>
  );
}
