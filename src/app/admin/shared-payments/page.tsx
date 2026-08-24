import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/money-text";
import { formatDate } from "@/lib/time";
import { Th, Td, TableHead } from "@/components/admin/admin-table";
import { SHARED_PAYMENT_STATUS_LABELS_AR } from "@/lib/labels";

export const metadata: Metadata = { title: "الدفع التشاركي" };

export default async function AdminSharedPaymentsPage() {
  const items = await db.sharedPayment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الدفع التشاركي</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <Th>العنوان</Th>
              <Th>المنشئ</Th>
              <Th>المجموع / الهدف</Th>
              <Th>الحالة</Th>
              <Th>المهلة</Th>
              <Th>تاريخ الإنشاء</Th>
            </tr>
          </TableHead>
          <tbody>
            {items.map((sp) => (
              <tr key={sp.id} className="border-b border-border last:border-0">
                <Td className="font-semibold">{sp.title}</Td>
                <Td className="text-muted-foreground">{sp.createdBy.name}</Td>
                <Td>
                  <MoneyText amountMinor={sp.collectedAmount} currency={sp.currency} /> / <MoneyText amountMinor={sp.targetAmount} currency={sp.currency} />
                </Td>
                <Td>
                  <Badge variant="secondary">{SHARED_PAYMENT_STATUS_LABELS_AR[sp.status]}</Badge>
                </Td>
                <Td className="text-muted-foreground">{sp.deadline ? formatDate(sp.deadline) : "—"}</Td>
                <Td className="text-muted-foreground">{formatDate(sp.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
