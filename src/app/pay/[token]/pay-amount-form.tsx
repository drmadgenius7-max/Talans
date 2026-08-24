"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDecimalString } from "@/lib/money";
import { startPaymentRequestChargeAction } from "@/server/payment-requests/actions";

export function PayAmountForm({
  paymentRequestId,
  remainingMinor,
  currency,
}: {
  paymentRequestId: string;
  remainingMinor: number;
  currency: string;
}) {
  const router = useRouter();
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState(toDecimalString(remainingMinor, currency));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setLoading(true);
    const result = await startPaymentRequestChargeAction(
      paymentRequestId,
      partial ? Math.round(Number(amount) * 100) : undefined,
    );
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(result.redirectUrl.replace(/^https?:\/\/[^/]+/, ""));
  }

  return (
    <div className="space-y-3">
      {partial && (
        <div className="space-y-1.5 text-start">
          <Label htmlFor="amount">المبلغ الذي تريد دفعه</Label>
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      )}
      <Button size="lg" className="w-full" onClick={pay} loading={loading}>
        ادفع {partial ? amount : toDecimalString(remainingMinor, currency)} {currency}
      </Button>
      {!partial && (
        <button type="button" onClick={() => setPartial(true)} className="text-xs text-muted-foreground underline">
          أريد دفع مبلغ جزئي
        </button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
