import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/time";
import { Th, Td, TableHead } from "@/components/admin/admin-table";

export const metadata: Metadata = { title: "المستخدمون" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المستخدمون</h1>
      <form>
        <Input name="q" defaultValue={q} placeholder="ابحث بالاسم أو البريد أو الجوال" className="max-w-sm" />
      </form>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <TableHead>
            <tr>
              <Th>الاسم</Th>
              <Th>البريد / الجوال</Th>
              <Th>الدور</Th>
              <Th>الحالة</Th>
              <Th>تاريخ التسجيل</Th>
            </tr>
          </TableHead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <Td>{u.name}</Td>
                <Td className="text-muted-foreground">{u.email ?? u.phone ?? "—"}</Td>
                <Td>
                  <Badge variant={u.role === "ADMIN" ? "warning" : "secondary"}>{u.role}</Badge>
                </Td>
                <Td>
                  <Badge variant={u.status === "ACTIVE" ? "success" : "destructive"}>{u.status}</Badge>
                </Td>
                <Td className="text-muted-foreground">{formatDate(u.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
