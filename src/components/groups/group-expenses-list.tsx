import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MoneyText } from "@/components/money-text";
import { formatDate } from "@/lib/time";
import { SPLIT_TYPE_LABELS_AR } from "@/lib/labels";

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: Date;
  splitType: string;
  category: { icon: string; nameAr: string } | null;
  payers: { groupMember: { user: { name: string } | null; guestName: string | null } }[];
}

export function GroupExpensesList({ groupId, expenses }: { groupId: string; expenses: ExpenseRow[] }) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="ما أضفت أي مصروف لهذه المجموعة"
        description="أضف أول مصروف وقسّمه على الأعضاء بأي طريقة تناسبكم."
        action={
          <Button asChild size="sm">
            <Link href={`/expenses/new?mode=general&groupId=${groupId}`}>
              <Plus className="h-4 w-4" /> إضافة مصروف
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href={`/expenses/new?mode=general&groupId=${groupId}`}>
            <Plus className="h-4 w-4" /> إضافة مصروف
          </Link>
        </Button>
      </div>
      {expenses.map((expense) => {
        const payerNames = expense.payers
          .map((p) => p.groupMember.user?.name ?? p.groupMember.guestName ?? "ضيف")
          .join("، ");
        return (
          <Card key={expense.id} className="flex items-center gap-3 p-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
              {expense.category?.icon ?? "💸"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{expense.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                دفع {payerNames} · {formatDate(expense.date)} · {SPLIT_TYPE_LABELS_AR[expense.splitType]}
              </p>
            </div>
            <MoneyText amountMinor={expense.amount} currency={expense.currency} className="font-bold shrink-0" />
          </Card>
        );
      })}
    </div>
  );
}
