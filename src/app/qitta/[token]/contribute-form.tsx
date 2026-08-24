"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toDecimalString } from "@/lib/money";
import { contributeAction } from "@/server/shared-payments/actions";

const QUICK_AMOUNTS = [50, 100, 250, 500];

export function ContributeForm({
  token,
  currency,
  remaining,
  allowOverfunding,
  isLoggedIn,
  suggestedAmount,
}: {
  token: string;
  currency: string;
  remaining: number;
  allowOverfunding: boolean;
  isLoggedIn: boolean;
  suggestedAmount?: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(
    suggestedAmount && suggestedAmount > 0 ? toDecimalString(suggestedAmount, currency) : toDecimalString(Math.min(remaining, 5000), currency),
  );
  const [guestName, setGuestName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!isLoggedIn && !guestName.trim()) {
      setError("أدخل اسمك");
      return;
    }
    setLoading(true);
    const result = await contributeAction({
      sharedPaymentToken: token,
      amount: Number(amount),
      isAnonymous,
      guestName,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "حدث خطأ، حاول مرة أخرى");
      return;
    }
    router.push(result.redirectUrl!.replace(/^https?:\/\/[^/]+/, ""));
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {!isLoggedIn && (
        <div className="space-y-1.5 text-start">
          <Label htmlFor="guestName">اسمك</Label>
          <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="اسمك" />
        </div>
      )}

      <div className="space-y-1.5 text-start">
        <Label htmlFor="amount">مبلغ المساهمة</Label>
        <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {!allowOverfunding && remaining > 0 && Number(amount) * 100 > remaining && (
          <p className="text-xs text-destructive">أقصى مبلغ متبقي هو {toDecimalString(remaining, currency)} {currency}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
          >
            {v}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={isAnonymous} onCheckedChange={(c) => setIsAnonymous(Boolean(c))} />
        ساهم بشكل مجهول
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button size="lg" className="w-full" onClick={submit} loading={loading}>
        ساهم الآن
      </Button>
    </div>
  );
}
