"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, HandCoins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/money-text";
import { toDecimalString } from "@/lib/money";
import { toast } from "@/components/ui/toaster";
import { createRequestFromTransferAction } from "@/server/settlement/actions";
import { ManualSettlementDialog } from "./manual-settlement-dialog";
import type { SettlementPlanItem } from "@/server/settlement/actions";

export function SettlementTransferRow({
  groupId,
  item,
  currency,
}: {
  groupId: string;
  item: SettlementPlanItem;
  currency: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  async function sendRequest() {
    setLoading(true);
    const result = await createRequestFromTransferAction(groupId, item.fromMemberId, item.toMemberId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("تم إرسال المطالبة");
    router.push(`/pay/${result.token}?created=1`);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="font-bold">{item.fromName}</span>
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        <span className="font-bold">{item.toName}</span>
      </div>
      <p className="text-center text-lg font-black">
        <MoneyText amountMinor={item.amountMinor} currency={currency} />
      </p>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={sendRequest} loading={loading} disabled={!item.toUserId}>
          <Send className="h-3.5 w-3.5" /> أرسل مطالبة
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => setManualOpen(true)}>
          <HandCoins className="h-3.5 w-3.5" /> تم الدفع خارج قِطّة
        </Button>
      </div>
      {!item.toUserId && <p className="text-center text-xs text-muted-foreground">هذا الشخص بدون حساب — استخدم التسجيل اليدوي</p>}

      <ManualSettlementDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        groupId={groupId}
        fromMemberId={item.fromMemberId}
        toMemberId={item.toMemberId}
        defaultAmount={Number(toDecimalString(item.amountMinor, currency))}
        currency={currency}
      />
    </Card>
  );
}
