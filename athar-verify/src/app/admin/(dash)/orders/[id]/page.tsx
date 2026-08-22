import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CopyButton } from '@/components/copy-button';
import { DocumentationActions } from '@/components/admin/documentation-actions';
import { OrderDangerZone } from '@/components/admin/order-danger-zone';
import { getOrderById } from '@/lib/services/orders';
import { AppError } from '@/lib/errors';
import { buildVerificationUrl } from '@/lib/qr';
import {
  CHECK_SOURCE_AR,
  countryLabel,
  ORDER_STATUS_AR,
  PROCESSING_STATUS_AR,
} from '@/lib/i18n/countries';
import { resultCopy } from '@/lib/analysis/verdict';
import { formatBytes, formatDateAr, formatDateTimeAr, formatDuration, shortHash } from '@/lib/utils';
import { requirePageUser } from '@/lib/auth/guard';
import type { VideoTechnicalMetadata } from '@/lib/media/ffprobe';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تفاصيل الطلب' };

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const user = await requirePageUser('VIEWER');
  const { id } = await params;

  let order;
  try {
    order = await getOrderById(id);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }

  const link = order.verificationLinks[0] ?? null;
  const verificationUrl = link ? buildVerificationUrl(link.verificationId, link.token) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 rotate-180" />
          الطلبات
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="ltr-nums text-xl font-bold tracking-tight">{order.orderNumber}</h1>
          <Badge variant={order.status === 'CANCELLED' ? 'muted' : 'success'}>
            {ORDER_STATUS_AR[order.status]}
          </Badge>
          {order.deletedAt && <Badge variant="danger">محذوف</Badge>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-bold">بيانات الطلب</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="الدولة" value={countryLabel(order.countryCode, order.countryNameAr)} />
              <Row label="تاريخ التنفيذ" value={formatDateAr(order.executionDate)} />
              <Row label="نوع الخدمة" value={order.serviceType ?? '—'} />
              <Row label="اسم العميل" value={order.customerName ?? '—'} />
              <Row
                label="إظهار الاسم للعميل"
                value={order.showCustomerName ? 'نعم' : 'لا'}
              />
              <Row label="جوال العميل" value={order.customerPhone ?? '—'} ltr />
              <Row label="أُنشئ بواسطة" value={order.createdBy?.name ?? '—'} />
              <Row label="تاريخ الإنشاء" value={formatDateTimeAr(order.createdAt)} />
            </dl>

            {order.notes && (
              <div className="mt-4 rounded-xl bg-secondary/50 p-3">
                <p className="text-xs font-semibold">ملاحظات</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {order.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {link && verificationUrl && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-5">
              <h2 className="self-start text-sm font-bold">رابط التحقق و QR</h2>

              <div className="rounded-xl border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr/${link.verificationId}?t=${encodeURIComponent(link.token)}`}
                  alt={`QR ${link.verificationId}`}
                  className="size-40"
                />
              </div>

              <p className="ltr-nums text-xs font-semibold">{link.verificationId}</p>

              <div className="flex w-full flex-col gap-2">
                <CopyButton value={verificationUrl} label="نسخ رابط التحقق" className="w-full" />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={verificationUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    فتح الصفحة العامة
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <a
                    href={`/api/qr/${link.verificationId}?t=${encodeURIComponent(link.token)}&format=png`}
                    download={`${link.verificationId}.png`}
                  >
                    تنزيل QR بصيغة PNG
                  </a>
                </Button>
              </div>

              <p className="ltr-nums text-[11px] text-muted-foreground">
                مرات الفتح: {link.viewCount}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-bold">ملفات التوثيق</h2>

          {order.documentation.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد ملفات توثيق لهذا الطلب.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {order.documentation.map((doc) => {
                const meta = (doc.metadataJson as { technical?: VideoTechnicalMetadata } | null) ?? null;
                const tech = meta?.technical ?? null;

                return (
                  <div key={doc.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{doc.originalFilename}</span>
                        {doc.isPrimary && <Badge>أساسي</Badge>}
                        <Badge
                          variant={
                            doc.processingStatus === 'READY'
                              ? 'success'
                              : doc.processingStatus === 'FAILED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {PROCESSING_STATUS_AR[doc.processingStatus]}
                        </Badge>
                      </div>
                      <DocumentationActions
                        documentationId={doc.id}
                        downloadAllowed={doc.downloadAllowed}
                        canManage={user.role !== 'VIEWER'}
                      />
                    </div>

                    {doc.processingError && (
                      <p className="mt-2 text-xs text-destructive">{doc.processingError}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="ltr-nums rounded bg-secondary px-2 py-1 font-mono text-[11px]">
                        SHA-256: {shortHash(doc.sha256, 12, 8)}
                      </code>
                      <CopyButton value={doc.sha256} label="نسخ البصمة" />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs sm:grid-cols-4">
                      <Row label="الحجم" value={formatBytes(doc.filesize)} small />
                      <Row label="المدة" value={formatDuration(doc.durationSeconds)} small />
                      <Row label="النوع" value={doc.mimeType} small ltr />
                      <Row label="التخزين" value={doc.storageDriver} small ltr />
                      {tech?.video && (
                        <>
                          <Row
                            label="الدقة"
                            value={`${tech.video.width ?? '?'}×${tech.video.height ?? '?'}`}
                            small
                            ltr
                          />
                          <Row label="FPS" value={String(tech.video.fps ?? '—')} small ltr />
                          <Row label="ترميز الفيديو" value={tech.video.codec ?? '—'} small ltr />
                        </>
                      )}
                      {tech?.audio && (
                        <Row label="ترميز الصوت" value={tech.audio.codec ?? '—'} small ltr />
                      )}
                      {tech?.encoder && <Row label="Encoder" value={tech.encoder} small ltr />}
                      {tech?.creationTime && (
                        <Row label="تاريخ الإنشاء" value={tech.creationTime} small ltr />
                      )}
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <h2 className="border-b border-border p-5 text-sm font-bold">سجل عمليات التحقق</h2>

          {order.verificationChecks.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا توجد عمليات تحقق لهذا الطلب.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النتيجة</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>درجة التحقق</TableHead>
                  <TableHead>التشابه</TableHead>
                  <TableHead>بصمة الملف المرفوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.verificationChecks.map((check) => {
                  const copy = resultCopy(check.result);
                  return (
                    <TableRow key={check.id}>
                      <TableCell>
                        {check.source === 'LOOKUP' ? (
                          <Badge variant="muted">استعلام</Badge>
                        ) : (
                          <Badge
                            variant={
                              copy.tone === 'success'
                                ? 'success'
                                : copy.tone === 'danger'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {copy.badge}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {CHECK_SOURCE_AR[check.source]}
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.confidenceScore != null ? `${check.confidenceScore.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.similarityScore != null ? `${check.similarityScore.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="ltr-nums font-mono text-[11px]">
                        {check.uploadedFileHash ? shortHash(check.uploadedFileHash) : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTimeAr(check.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {user.role === 'ADMIN' || user.role === 'OWNER' ? (
        <OrderDangerZone orderId={order.id} orderNumber={order.orderNumber} />
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  small,
  ltr,
}: {
  label: string;
  value: string;
  small?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <dt className={small ? 'text-[11px] text-muted-foreground' : 'text-xs text-muted-foreground'}>
        {label}
      </dt>
      <dd className={`${small ? 'text-xs' : 'text-sm'} font-medium ${ltr ? 'ltr-nums' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
