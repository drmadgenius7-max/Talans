"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { recordManualSettlementAction } from "@/server/settlement/actions";
import { SETTLEMENT_METHOD_LABELS_AR } from "@/lib/labels";
import type { SettlementMethod } from "@prisma/client";

export function ManualSettlementDialog({
  open,
  onOpenChange,
  groupId,
  fromMemberId,
  toMemberId,
  defaultAmount,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  defaultAmount: number;
  currency: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState<SettlementMethod>("CASH");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const result = await recordManualSettlementAction({ groupId, fromMemberId, toMemberId, amount: Number(amount), method, note });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("تم تسجيل التسوية");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل تسوية يدوية</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>طريقة الدفع</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as SettlementMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["CASH", "BANK_TRANSFER", "OTHER"] as const).map((m) => (
                  <SelectItem key={m} value={m}>
                    {SETTLEMENT_METHOD_LABELS_AR[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settle-amount">المبلغ ({currency})</Label>
            <Input id="settle-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settle-note">ملاحظة (اختياري)</Label>
            <Textarea id="settle-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            هذه تسوية <b>يدوية</b> غير موثّقة عبر بوابة دفع — بخلاف الدفع الإلكتروني الذي يتم تأكيده تلقائيًا.
          </p>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={submit} loading={loading}>
            تأكيد التسوية
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
