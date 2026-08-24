"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Ban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateMockPaymentAction } from "@/server/payment-requests/actions";
import { toast } from "@/components/ui/toaster";
import type { PaymentOutcome } from "@/server/payments/types";

const OUTCOMES: { outcome: PaymentOutcome; label: string; icon: typeof CheckCircle2; variant: "default" | "destructive" | "outline" | "secondary" }[] = [
  { outcome: "SUCCEEDED", label: "نجاح الدفع", icon: CheckCircle2, variant: "default" },
  { outcome: "FAILED", label: "فشل الدفع", icon: XCircle, variant: "destructive" },
  { outcome: "CANCELLED", label: "إلغاء الدفع", icon: Ban, variant: "outline" },
  { outcome: "PENDING", label: "إبقاء معلّق", icon: Clock, variant: "secondary" },
];

export function SimulatorButtons({ transactionId, returnUrl }: { transactionId: string; returnUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<PaymentOutcome | null>(null);

  async function choose(outcome: PaymentOutcome) {
    setLoading(outcome);
    const result = await simulateMockPaymentAction(transactionId, outcome);
    setLoading(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (outcome === "SUCCEEDED") toast.success("تم الدفع بنجاح 🎉");
    else if (outcome === "FAILED") toast.error("فشل الدفع");
    else if (outcome === "CANCELLED") toast.info("تم إلغاء الدفع");
    router.push(returnUrl);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {OUTCOMES.map((o) => (
        <Button key={o.outcome} variant={o.variant} onClick={() => choose(o.outcome)} loading={loading === o.outcome} disabled={loading !== null}>
          <o.icon className="h-4 w-4" /> {o.label}
        </Button>
      ))}
    </div>
  );
}
