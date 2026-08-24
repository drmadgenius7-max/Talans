import Link from "next/link";
import { Scale, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoneyText } from "@/components/money-text";

interface MemberBalance {
  id: string;
  name: string;
  avatarUrl: string | null;
  netBalance: number;
}

export function GroupOverview({
  groupId,
  currency,
  members,
  totalExpenses,
  expenseCount,
  canSettle,
}: {
  groupId: string;
  currency: string;
  members: MemberBalance[];
  totalExpenses: number;
  expenseCount: number;
  canSettle: boolean;
}) {
  const sorted = [...members].sort((a, b) => b.netBalance - a.netBalance);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">إجمالي المصاريف</p>
          <p className="mt-1 text-lg font-bold">
            <MoneyText amountMinor={totalExpenses} currency={currency} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">عدد المصاريف</p>
          <p className="mt-1 text-lg font-bold">{expenseCount}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold">أرصدة الأعضاء</p>
          {canSettle && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/groups/${groupId}/settle`}>
                <Scale className="h-4 w-4" /> سوِّ الحساب
              </Link>
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {sorted.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.avatarUrl ?? undefined} />
                  <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{m.name}</span>
              </div>
              <div className="text-sm">
                {m.netBalance === 0 ? (
                  <span className="text-muted-foreground">متعادل</span>
                ) : (
                  <span className={m.netBalance > 0 ? "text-success" : "text-destructive"}>
                    {m.netBalance > 0 ? "له" : "عليه"} <MoneyText amountMinor={Math.abs(m.netBalance)} currency={currency} className="font-bold" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button asChild className="w-full">
        <Link href={`/expenses/new?mode=general&groupId=${groupId}`}>
          <Receipt className="h-4 w-4" /> إضافة مصروف
        </Link>
      </Button>
    </div>
  );
}
