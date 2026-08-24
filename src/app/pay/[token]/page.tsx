import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PublicPageShell } from "@/components/public-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyText } from "@/components/money-text";
import { ShareActions } from "@/components/share-actions";
import { PayAmountForm } from "./pay-amount-form";
import { PAYMENT_REQUEST_STATUS_LABELS_AR } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { generateQrDataUrl } from "@/lib/qr";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "طلب دفع" };

const TERMINAL_BADGE: Record<string, "success" | "destructive" | "secondary" | "warning"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
  FAILED: "destructive",
  OVERDUE: "destructive",
};

export default async function PublicPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { token } = await params;
  const { created } = await searchParams;

  const request = await db.paymentRequest.findUnique({
    where: { secureToken: token },
    include: { requester: { select: { name: true, avatarUrl: true } } },
  });

  if (!request) {
    return (
      <PublicPageShell>
        <ErrorCard icon={XCircle} title="رابط غير صالح" description="هذا الرابط غير موجود أو تم حذفه." />
      </PublicPageShell>
    );
  }

  if (request.revokedAt || request.status === "CANCELLED") {
    return (
      <PublicPageShell>
        <ErrorCard icon={XCircle} title="تم إلغاء المطالبة" description="طالب الدفع ألغى هذه المطالبة." />
      </PublicPageShell>
    );
  }

  if (request.tokenExpiresAt && request.tokenExpiresAt < new Date()) {
    return (
      <PublicPageShell>
        <ErrorCard icon={Clock} title="انتهت صلاحية الرابط" description="اطلب من الشخص إرسال رابط جديد." />
      </PublicPageShell>
    );
  }

  // Mark as viewed (best-effort, non-blocking on the render).
  if (request.status === "PENDING") {
    db.paymentRequest.update({ where: { id: request.id }, data: { status: "VIEWED", viewedAt: new Date() } }).catch(() => {});
  }

  const remaining = request.amount - request.paidAmount;
  const payerName = request.payerGuestName ?? "أنت";
  const isSettled = request.status === "PAID";
  const canPay = !["PAID", "CANCELLED", "REFUNDED", "FAILED"].includes(request.status);

  const shareUrl = `${env.appUrl}/pay/${token}`;
  const qrDataUrl = await generateQrDataUrl(shareUrl);
  const message = `هلا ${payerName} 👋\nحصتك في "${request.reason}" ${(request.amount / 100).toFixed(2)} ${request.currency}.\nتقدر تسددها من الرابط التالي:`;

  return (
    <PublicPageShell>
      <div className="space-y-4">
        <Card>
          <CardHeader className="items-center text-center">
            <p className="text-sm text-muted-foreground">طالب الدفع</p>
            <p className="text-lg font-bold">{request.requester.name}</p>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{request.reason}</p>
              <p className="mt-1 text-4xl font-black tracking-tight">
                <MoneyText amountMinor={request.amount} currency={request.currency} />
              </p>
            </div>

            <Badge variant={TERMINAL_BADGE[request.status] ?? "secondary"} className="mx-auto">
              {PAYMENT_REQUEST_STATUS_LABELS_AR[request.status]}
            </Badge>

            {request.status === "PARTIALLY_PAID" && (
              <p className="text-sm text-muted-foreground">
                دفعت <MoneyText amountMinor={request.paidAmount} currency={request.currency} /> — متبقي{" "}
                <MoneyText amountMinor={remaining} currency={request.currency} className="font-bold text-foreground" />
              </p>
            )}

            {request.dueDate && canPay && <p className="text-xs text-muted-foreground">تاريخ الاستحقاق: {formatDate(request.dueDate)}</p>}

            {isSettled ? (
              <div className="flex flex-col items-center gap-2 py-2 text-success">
                <CheckCircle2 className="h-10 w-10" />
                <p className="font-bold">تم الدفع بنجاح ✓</p>
              </div>
            ) : canPay ? (
              <PayAmountForm paymentRequestId={request.id} remainingMinor={remaining} currency={request.currency} />
            ) : (
              <p className="text-sm text-muted-foreground">هذه المطالبة لم تعد قابلة للدفع.</p>
            )}
          </CardContent>
        </Card>

        {(created || canPay) && (
          <Card className="p-4">
            <p className="mb-2 text-sm font-semibold">مشاركة الرابط</p>
            <ShareActions url={shareUrl} message={message} qrDataUrl={qrDataUrl} title="مطالبة من قِطّة" />
          </Card>
        )}
      </div>
    </PublicPageShell>
  );
}

function ErrorCard({ icon: Icon, title, description }: { icon: typeof XCircle; title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Icon className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-bold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
