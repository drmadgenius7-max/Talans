import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartyPopper, Scale } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { requireMembership } from "@/server/groups/actions";
import { getSettlementPlan } from "@/server/settlement/actions";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettlementTransferRow } from "@/components/settlement/settlement-transfer-row";

export const metadata: Metadata = { title: "تسوية الحساب" };

export default async function SettleGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();

  await requireMembership(groupId, user.id);
  const { plan, currency, fullySettled } = await getSettlementPlan(groupId);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Scale className="h-6 w-6 text-primary" /> تسوية حساب {group.name}
          </CardTitle>
          <CardDescription>أفضل طريقة لتصفير الحسابات بأقل عدد تحويلات</CardDescription>
        </CardHeader>
        <CardContent>
          {fullySettled ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <PartyPopper className="h-12 w-12 text-success" />
              <p className="text-lg font-bold">تمت التسوية بالكامل ✓</p>
              <p className="text-sm text-muted-foreground">كل الحسابات متعادلة في هذه المجموعة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plan.map((item, idx) => (
                <SettlementTransferRow key={idx} groupId={groupId} item={item} currency={currency} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
