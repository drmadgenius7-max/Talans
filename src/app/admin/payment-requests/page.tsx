import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/money-text";
import { formatDate } from "@/lib/time";
import { Th, Td, TableHead } from "@/components/admin/admin-table";
import { PAYMENT_REQUEST_STATUS_LABELS_AR } from "@/lib/labels";

export const metadata: Metadata = { title: "المطالبات" };

export default async function AdminPaymentRequestsPage() {
  const requests = await db.paymentRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { requester: { select: { name: true } }, payerUser: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المطالبات</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <Th>السبب</Th>
              <Th>الطالب</Th>
              <Th>المدين</Th>
              <Th>المبلغ</Th>
              <Th>المدفوع</Th>
              <Th>الحالة</Th>
              <Th>الإنشاء</Th>
            </tr>
          </TableHead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <Td className="font-semibold">{r.reason}</Td>
                <Td className="text-muted-foreground">{r.requester.name}</Td>
                <Td className="text-muted-foreground">{r.payerUser?.name ?? r.payerGuestName ?? "—"}</Td>
                <Td>
                  <MoneyText amountMinor={r.amount} currency={r.currency} className="font-semibold" />
                </Td>
                <Td>
                  <MoneyText amountMinor={r.paidAmount} currency={r.currency} />
                </Td>
                <Td>
                  <Badge variant="secondary">{PAYMENT_REQUEST_STATUS_LABELS_AR[r.status]}</Badge>
                </Td>
                <Td className="text-muted-foreground">{formatDate(r.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
