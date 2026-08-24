import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/time";
import { Th, Td, TableHead } from "@/components/admin/admin-table";
import { GROUP_TYPE_LABELS_AR } from "@/lib/labels";

export const metadata: Metadata = { title: "المجموعات" };

export default async function AdminGroupsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const groups = await db.group.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { _count: { select: { members: true, expenses: true } }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المجموعات</h1>
      <form>
        <Input name="q" defaultValue={q} placeholder="ابحث باسم المجموعة" className="max-w-sm" />
      </form>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <Th>الاسم</Th>
              <Th>النوع</Th>
              <Th>المُنشئ</Th>
              <Th>الأعضاء</Th>
              <Th>المصاريف</Th>
              <Th>العملة</Th>
              <Th>الحالة</Th>
              <Th>تاريخ الإنشاء</Th>
            </tr>
          </TableHead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-b border-border last:border-0">
                <Td className="font-semibold">{g.name}</Td>
                <Td>{GROUP_TYPE_LABELS_AR[g.type]}</Td>
                <Td className="text-muted-foreground">{g.createdBy.name}</Td>
                <Td>{g._count.members}</Td>
                <Td>{g._count.expenses}</Td>
                <Td>{g.currency}</Td>
                <Td>
                  <Badge variant={g.isArchived ? "secondary" : "success"}>{g.isArchived ? "مؤرشفة" : "نشطة"}</Badge>
                </Td>
                <Td className="text-muted-foreground">{formatDate(g.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
