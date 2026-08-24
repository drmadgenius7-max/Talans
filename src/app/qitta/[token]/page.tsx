import type { Metadata } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/session";
import { ensureNotExpired } from "@/server/shared-payments/actions";
import { PublicPageShell } from "@/components/public-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MoneyText } from "@/components/money-text";
import { ShareActions } from "@/components/share-actions";
import { SHARED_PAYMENT_STATUS_LABELS_AR } from "@/lib/labels";
import { getCountdown, formatCountdownAr } from "@/lib/time";
import { generateQrDataUrl } from "@/lib/qr";
import { ContributeForm } from "./contribute-form";
import { Check, Circle, XCircle, PartyPopper } from "lucide-react";

export const metadata: Metadata = { title: "دفع تشاركي" };

const STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary" | "warning" | "default"> = {
  ACTIVE: "default",
  PARTIALLY_FUNDED: "warning",
  FUNDED: "success",
  PROCESSING: "warning",
  COMPLETED: "success",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
  REFUND_PENDING: "secondary",
  REFUNDED: "secondary",
  FAILED: "destructive",
};

export default async function SharedPaymentPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const initial = await db.sharedPayment.findUnique({ where: { secureToken: token } });
  if (!initial) {
    return (
      <PublicPageShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-bold">رابط غير صالح</p>
          </CardContent>
        </Card>
      </PublicPageShell>
    );
  }

  await ensureNotExpired(initial.id);

  const sp = await db.sharedPayment.findUniqueOrThrow({
    where: { id: initial.id },
    include: {
      createdBy: { select: { name: true } },
      participants: { include: { user: { select: { name: true } } } },
    },
  });

  const user = await getCurrentUser();
  const progressPct = sp.targetAmount > 0 ? Math.min(100, Math.round((sp.collectedAmount / sp.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, sp.targetAmount - sp.collectedAmount);
  const canContribute = ["ACTIVE", "PARTIALLY_FUNDED"].includes(sp.status);
  const myParticipant = user ? sp.participants.find((p) => p.userId === user.id) : undefined;

  const countdown = sp.deadline ? getCountdown(sp.deadline) : null;
  const shareUrl = `${env.appUrl}/qitta/${token}`;
  const qrDataUrl = await generateQrDataUrl(shareUrl);
  const message = `يا هلا 👋\nنجمع مبلغ "${sp.title}" مع بعض في قِطّة. ساهم بحصتك من الرابط:`;

  return (
    <PublicPageShell>
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <p className="text-sm text-muted-foreground">{sp.createdBy.name} ينظّم</p>
            <p className="text-xl font-bold">{sp.title}</p>
            {sp.description && <p className="text-sm text-muted-foreground">{sp.description}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant={STATUS_VARIANT[sp.status]} className="mx-auto flex w-fit">
              {SHARED_PAYMENT_STATUS_LABELS_AR[sp.status]}
            </Badge>

            {sp.privacyShowTotal && (
              <div className="space-y-2">
                <Progress value={progressPct} />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">
                    <MoneyText amountMinor={sp.collectedAmount} currency={sp.currency} /> / <MoneyText amountMinor={sp.targetAmount} currency={sp.currency} />
                  </span>
                  <span className="font-bold text-primary">{progressPct}%</span>
                </div>
                {canContribute && (
                  <p className="text-xs text-muted-foreground">
                    متبقي <MoneyText amountMinor={remaining} currency={sp.currency} />
                  </p>
                )}
              </div>
            )}

            {countdown && canContribute && (
              <p className="text-center text-sm font-semibold text-accent-700">
                {countdown.expired ? "انتهت المهلة" : `متبقي: ${formatCountdownAr(countdown)}`}
              </p>
            )}

            {sp.status === "FUNDED" || sp.status === "COMPLETED" ? (
              <div className="flex flex-col items-center gap-2 py-2 text-success">
                <PartyPopper className="h-10 w-10" />
                <p className="font-bold">اكتملت القِطّة 🎉</p>
              </div>
            ) : sp.status === "EXPIRED" ? (
              <p className="text-center text-sm text-muted-foreground">انتهت المهلة قبل اكتمال الهدف. إذا تم تحصيل مبالغ فسيتم استردادها.</p>
            ) : sp.status === "CANCELLED" ? (
              <p className="text-center text-sm text-muted-foreground">تم إلغاء هذه العملية.</p>
            ) : canContribute ? (
              <ContributeForm token={token} currency={sp.currency} remaining={remaining} allowOverfunding={sp.allowOverfunding} isLoggedIn={Boolean(user)} suggestedAmount={myParticipant?.targetShare ? myParticipant.targetShare - myParticipant.paidAmount : undefined} />
            ) : null}

            {sp.participants.length > 0 && (sp.privacyShowNames || sp.privacyShowAmounts) && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-sm font-bold">المشاركون</p>
                {sp.participants.map((p) => {
                  const name = p.user?.name ?? p.guestName ?? "مشارك";
                  const paid = p.status === "PAID";
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        {paid ? <Check className="h-3.5 w-3.5 text-success" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                        {sp.privacyShowNames ? name : "مساهم"}
                      </span>
                      {sp.privacyShowAmounts && p.targetShare ? <MoneyText amountMinor={p.targetShare} currency={sp.currency} /> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">مشاركة القِطّة</p>
          <ShareActions url={shareUrl} message={message} qrDataUrl={qrDataUrl} title="دفع تشاركي — قِطّة" />
        </Card>
      </div>
    </PublicPageShell>
  );
}
