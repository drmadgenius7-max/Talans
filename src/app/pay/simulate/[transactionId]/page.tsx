import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PublicPageShell } from "@/components/public-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoneyText } from "@/components/money-text";
import { SimulatorButtons } from "./simulator-buttons";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "محاكاة الدفع" };

export default async function SimulatePaymentPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const txn = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { paymentRequest: true, sharedPayment: true },
  });
  if (!txn) notFound();

  const returnUrl =
    txn.purpose === "PAYMENT_REQUEST" && txn.paymentRequest
      ? `/pay/${txn.paymentRequest.secureToken}`
      : txn.sharedPayment
        ? `/qitta/${txn.sharedPayment.secureToken}`
        : "/dashboard";

  const description = txn.paymentRequest?.reason ?? txn.sharedPayment?.title ?? "عملية دفع";

  if (txn.status !== "PENDING" && txn.status !== "PROCESSING") {
    return (
      <PublicPageShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-bold">تمت معالجة هذه العملية بالفعل</p>
            <a href={returnUrl} className="text-sm text-primary underline">
              الرجوع
            </a>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            محاكاة دفع — لا توجد أموال حقيقية
          </div>
          <CardTitle>{description}</CardTitle>
          <CardDescription>
            <MoneyText amountMinor={txn.amount} currency={txn.currency} className="text-2xl font-black text-foreground" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimulatorButtons transactionId={txn.id} returnUrl={returnUrl} />
        </CardContent>
      </Card>
    </PublicPageShell>
  );
}
