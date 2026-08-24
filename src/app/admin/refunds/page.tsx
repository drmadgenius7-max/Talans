import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/money-text";
import { formatDateTime } from "@/lib/time";
import { Th, Td, TableHead } from "@/components/admin/admin-table";

export const metadata: Metadata = { title: "الاستردادات" };

export default async function AdminRefundsPage() {
  const refunds = await db.refund.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { transaction: { include: { contributorUser: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الاستردادات</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <Th>المعاملة</Th>
              <Th>المستخدم</Th>
              <Th>المبلغ</Th>
              <Th>السبب</Th>
              <Th>الحالة</Th>
              <Th>التاريخ</Th>
            </tr>
          </TableHead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <Td className="font-mono text-xs text-muted-foreground">{r.transactionId.slice(0, 10)}…</Td>
                <Td>{r.transaction.contributorUser?.name ?? "—"}</Td>
                <Td>
                  <MoneyText amountMinor={r.amount} currency={r.transaction.currency} className="font-semibold" />
                </Td>
                <Td className="text-muted-foreground">{r.reason ?? "—"}</Td>
                <Td>
                  <Badge variant={r.status === "SUCCEEDED" ? "success" : "secondary"}>{r.status}</Badge>
                </Td>
                <Td className="text-muted-foreground">{formatDateTime(r.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {refunds.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد استردادات بعد</p>}
      </Card>
    </div>
  );
}
