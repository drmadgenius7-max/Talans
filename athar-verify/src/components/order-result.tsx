'use client';

import * as React from 'react';
import { ChevronDown, Download, QrCode, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';
import { FingerprintPanel } from '@/components/fingerprint';
import { VerificationBadge } from '@/components/verification-badge';
import { UploadCompare } from '@/components/upload-compare';
import { TechnicalDetails } from '@/components/technical-details';
import { formatDateAr } from '@/lib/utils';
import type { PublicOrderViewDto } from '@/lib/types';

/**
 * The order result.
 *
 * Ordered by what the customer came for: the answer, the video, then the one
 * action that resolves a doubt ("check the copy I have"). Everything else —
 * fingerprint, QR, download, codecs — sits behind a single collapsed section,
 * because it is reassurance for the few rather than reading for the many.
 */
export function OrderResult({ view }: { view: PublicOrderViewDto }) {
  const { order } = view;
  const primary = order.documentation.find((d) => d.id === view.primaryDocumentationId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <VerificationBadge
        result="VERIFIED_ORIGINAL"
        size="large"
        title="توثيق أصلي مسجل لدى متجر أثر"
        message="هذا الفيديو هو النسخة المسجلة في نظام متجر أثر، وتم حفظ بصمته الرقمية عند رفعه."
      />

      {primary && (
        <Card className="animate-in-up overflow-hidden">
          <video
            key={primary.id}
            controls
            playsInline
            preload="metadata"
            poster={primary.thumbnailPath ?? undefined}
            className="aspect-video w-full bg-black"
          >
            <source src={primary.streamPath} type={primary.mimeType} />
            متصفحك لا يدعم تشغيل الفيديو.
          </video>

          <CardContent className="p-4">
            <dl className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-center text-xs">
              <Fact label="رقم الطلب" value={order.orderNumber} ltr />
              <Fact label="الدولة" value={order.country} />
              <Fact label="التاريخ" value={formatDateAr(order.executionDate)} />
              <Fact label="الحالة" value={order.statusAr} />
            </dl>
          </CardContent>
        </Card>
      )}

      {view.comparisonAvailable && primary && (
        <UploadCompare orderNumber={order.orderNumber} originalSha256={primary.sha256} />
      )}

      {primary && <MoreDetails view={view} />}
    </div>
  );
}

function Fact({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className={`font-semibold ${ltr ? 'ltr-nums' : ''}`}>{value}</dd>
    </div>
  );
}

/** Fingerprint, QR, download, and technical facts — all collapsed by default. */
function MoreDetails({ view }: { view: PublicOrderViewDto }) {
  const [open, setOpen] = React.useState(false);
  const { order } = view;
  const primary = order.documentation.find((d) => d.id === view.primaryDocumentationId);
  const extras = order.documentation.filter((d) => d.id !== primary?.id);

  if (!primary) return null;

  return (
    <div className="animate-in-up">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'إخفاء تفاصيل التوثيق' : 'تفاصيل التوثيق'}
      </button>

      {open && (
        <Card className="mt-3">
          <CardContent className="flex flex-col gap-4 p-5">
            <FingerprintPanel
              sha256={primary.sha256}
              registeredAt={formatDateAr(primary.registeredAt)}
            />

            <div className="flex flex-wrap gap-2">
              {primary.downloadPath && (
                <Button asChild variant="outline" size="sm">
                  <a href={primary.downloadPath} download>
                    <Download />
                    تنزيل الفيديو
                  </a>
                </Button>
              )}
              {order.verification?.whatsappShareUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={order.verification.whatsappShareUrl} target="_blank" rel="noreferrer">
                    <Share2 />
                    مشاركة
                  </a>
                </Button>
              )}
            </div>

            {extras.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {extras.map((doc) =>
                  doc.kind === 'IMAGE' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={doc.id}
                      src={doc.streamPath}
                      alt={doc.originalFilename}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  ) : null,
                )}
              </div>
            )}

            <TechnicalDetails documentation={primary} />

            {order.verification && <QrBlock verification={order.verification} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QrBlock({
  verification,
}: {
  verification: NonNullable<PublicOrderViewDto['order']['verification']>;
}) {
  const [showQr, setShowQr] = React.useState(false);

  return (
    <div className="border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={verification.url} label="نسخ رابط التحقق" />
        <Button type="button" variant="outline" size="sm" onClick={() => setShowQr((v) => !v)}>
          <QrCode />
          {showQr ? 'إخفاء QR' : 'عرض QR'}
        </Button>
      </div>

      {showQr && (
        <div className="mt-3 flex justify-center rounded-xl border border-border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={verification.qrPath}
            alt={`رمز QR لرابط التحقق ${verification.verificationId}`}
            className="size-44"
          />
        </div>
      )}
    </div>
  );
}
