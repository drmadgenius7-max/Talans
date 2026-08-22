'use client';

import * as React from 'react';
import {
  CalendarDays,
  Download,
  Globe2,
  Hash,
  Loader2,
  Package,
  QrCode,
  Share2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';
import { FingerprintPanel } from '@/components/fingerprint';
import { VerificationBadge } from '@/components/verification-badge';
import { UploadCompare } from '@/components/upload-compare';
import { TechnicalDetails } from '@/components/technical-details';
import { formatBytes, formatDateAr, formatDuration } from '@/lib/utils';
import type { PublicOrderViewDto } from '@/lib/types';

/**
 * The order result card.
 *
 * Order of information is deliberate: verdict, then the identifying facts, then
 * the video, then the fingerprint, then the optional self-check, then technical
 * detail. A customer who only reads the first screen still gets a complete,
 * correct answer.
 */
export function OrderResult({ view }: { view: PublicOrderViewDto }) {
  const { order } = view;
  const primary = order.documentation.find((d) => d.id === view.primaryDocumentationId) ?? null;
  const extras = order.documentation.filter((d) => d.id !== primary?.id);

  return (
    <div className="flex flex-col gap-5">
      <VerificationBadge
        result="VERIFIED_ORIGINAL"
        size="large"
        title="توثيق أصلي مسجل لدى متجر أثر"
        message="هذا الفيديو هو النسخة المسجلة في نظام متجر أثر وتم حفظ بصمته الرقمية عند رفعه."
      />

      <Card className="animate-in-up">
        <CardContent className="p-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Fact icon={Hash} label="رقم الطلب">
              <span className="ltr-nums font-semibold">{order.orderNumber}</span>
            </Fact>
            <Fact icon={Globe2} label="دولة التوزيع">
              {order.country}
            </Fact>
            <Fact icon={CalendarDays} label="تاريخ التوثيق">
              {formatDateAr(order.executionDate)}
            </Fact>
            <Fact icon={Package} label="الحالة">
              <Badge variant={order.status === 'CANCELLED' ? 'muted' : 'success'}>
                {order.statusAr}
              </Badge>
            </Fact>
            {order.serviceType && (
              <Fact icon={Package} label="نوع التوثيق">
                {order.serviceType}
              </Fact>
            )}
            {order.customerName && (
              <Fact icon={Package} label="اسم العميل">
                {order.customerName}
              </Fact>
            )}
          </dl>
        </CardContent>
      </Card>

      {primary ? (
        <Card className="animate-in-up overflow-hidden">
          <div className="bg-black">
            <video
              key={primary.id}
              controls
              playsInline
              preload="metadata"
              poster={primary.thumbnailPath ?? undefined}
              className="aspect-video w-full bg-black"
            >
              <source src={primary.streamPath} type={primary.mimeType} />
              متصفحك لا يدعم تشغيل الفيديو. يمكنك تنزيل الملف لمشاهدته.
            </video>
          </div>

          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>المدة: {formatDuration(primary.durationSeconds)}</span>
              <span>الحجم: {formatBytes(Number(primary.filesize))}</span>
              {primary.technical?.resolution && <span>الدقة: {primary.technical.resolution}</span>}
            </div>

            <FingerprintPanel
              sha256={primary.sha256}
              registeredAt={formatDateAr(primary.registeredAt)}
            />

            <div className="flex flex-wrap gap-2">
              {primary.downloadPath && (
                <Button asChild variant="outline">
                  <a href={primary.downloadPath} download>
                    <Download />
                    تنزيل الفيديو
                  </a>
                </Button>
              )}
              {order.verification?.whatsappShareUrl && (
                <Button asChild variant="outline">
                  <a href={order.verification.whatsappShareUrl} target="_blank" rel="noreferrer">
                    <Share2 />
                    مشاركة عبر واتساب
                  </a>
                </Button>
              )}
            </div>

            <TechnicalDetails documentation={primary} />
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-in-up">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            لا يوجد فيديو توثيق مرتبط بهذا الطلب حتى الآن.
          </CardContent>
        </Card>
      )}

      {extras.length > 0 && (
        <Card className="animate-in-up">
          <CardContent className="p-5 sm:p-6">
            <h3 className="mb-3 text-sm font-bold">ملفات توثيق إضافية</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {extras.map((doc) =>
                doc.kind === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={doc.id}
                    src={doc.streamPath}
                    alt={doc.originalFilename}
                    loading="lazy"
                    className="aspect-square w-full rounded-xl border border-border object-cover"
                  />
                ) : (
                  <a
                    key={doc.id}
                    href={doc.downloadPath ?? doc.streamPath}
                    className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs hover:bg-secondary"
                  >
                    <Download className="size-4" />
                    <span className="truncate">{doc.originalFilename}</span>
                  </a>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {view.comparisonAvailable && primary && (
        <UploadCompare orderNumber={order.orderNumber} originalSha256={primary.sha256} />
      )}

      {order.verification && <VerificationLinkCard verification={order.verification} />}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Hash;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function VerificationLinkCard({
  verification,
}: {
  verification: NonNullable<PublicOrderViewDto['order']['verification']>;
}) {
  const [showQr, setShowQr] = React.useState(false);

  return (
    <Card className="animate-in-up">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h3 className="text-sm font-bold">رابط التحقق الدائم</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            يمكنك حفظ هذا الرابط أو مشاركته للرجوع إلى صفحة التوثيق في أي وقت.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <code className="ltr-nums max-w-full flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-xs">
            {verification.url}
          </code>
          <CopyButton value={verification.url} label="نسخ الرابط" />
          <Button type="button" variant="outline" size="sm" onClick={() => setShowQr((v) => !v)}>
            <QrCode />
            {showQr ? 'إخفاء QR' : 'عرض QR'}
          </Button>
        </div>

        {showQr && (
          <div className="flex justify-center rounded-xl border border-border bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={verification.qrPath}
              alt={`رمز QR لرابط التحقق ${verification.verificationId}`}
              className="size-48"
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          رقم التحقق: <span className="ltr-nums font-semibold">{verification.verificationId}</span>
        </p>
      </CardContent>
    </Card>
  );
}
