import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  FileVideo,
  PackageSearch,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collectStats } from '@/lib/services/stats';
import { formatDateTimeAr } from '@/lib/utils';
import { CHECK_SOURCE_AR } from '@/lib/i18n/countries';
import { resultCopy } from '@/lib/analysis/verdict';
import { queueMode } from '@/lib/queue';
import { ffmpegAvailability } from '@/lib/media/ffmpeg';

export const metadata = { title: 'لوحة التحكم' };

export default async function AdminDashboardPage() {
  const [stats, availability] = await Promise.all([collectStats(), ffmpegAvailability()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-muted-foreground">نظرة عامة على الطلبات وعمليات التحقق.</p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">
            <Plus />
            إضافة طلب
          </Link>
        </Button>
      </div>

      {(!availability.ffmpeg || !availability.ffprobe) && (
        <Card className="border-warning/30 bg-warning/8">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="font-semibold">ffmpeg غير متاح على هذا الخادم</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                مطابقة البصمة الرقمية تعمل بشكل كامل، لكن تحليل تشابه المحتوى واستخراج البيانات
                التقنية معطّل. ثبّت ffmpeg ثم أعد معالجة التوثيقات.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={PackageSearch} label="الطلبات" value={stats.orders} hint={`${stats.ordersThisMonth} خلال ٣٠ يومًا`} />
        <Stat icon={FileVideo} label="ملفات التوثيق" value={stats.documentation} hint={`${stats.processingPending} قيد المعالجة`} />
        <Stat icon={ShieldCheck} label="عمليات رفع العملاء" value={stats.uploadsTotal} hint={`${stats.lookupsTotal} استعلام`} />
        <Stat icon={CheckCircle2} label="ملفات مطابقة" value={stats.matched} hint={`${stats.hashMatched} مطابقة تامة`} tone="success" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CheckCircle2} label="مطابقة بالبصمة" value={stats.hashMatched} tone="success" />
        <Stat icon={CheckCircle2} label="مطابقة بالمحتوى" value={stats.contentMatched} tone="success" />
        <Stat icon={AlertTriangle} label="تعذر التأكد" value={stats.unableToVerify} tone="warning" />
        <Stat icon={XCircle} label="لا يتطابق" value={stats.noMatch} tone="danger" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <h2 className="text-sm font-bold">آخر عمليات التحقق</h2>
            <Link href="/admin/verifications" className="text-xs font-semibold text-primary hover:underline">
              عرض الكل
            </Link>
          </div>

          {stats.recentChecks.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">لا توجد عمليات تحقق بعد.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>النتيجة</TableHead>
                  <TableHead>درجة التحقق</TableHead>
                  <TableHead>التشابه</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentChecks.map((check) => {
                  const copy = resultCopy(check.result);
                  return (
                    <TableRow key={check.id}>
                      <TableCell className="ltr-nums font-medium">{check.orderNumber ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            copy.tone === 'success' ? 'success' : copy.tone === 'danger' ? 'danger' : 'warning'
                          }
                        >
                          {copy.badge}
                        </Badge>
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.confidenceScore != null ? `${check.confidenceScore.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.similarityScore != null ? `${check.similarityScore.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {CHECK_SOURCE_AR[check.source] ?? check.source}
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

      <p className="text-center text-xs text-muted-foreground">
        وضع المعالجة: {queueMode() === 'redis' ? 'طابور Redis + worker' : 'تنفيذ داخلي (inline)'}
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/14 text-warning',
    danger: 'bg-destructive/12 text-destructive',
  }[tone];

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <span className={`flex size-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </span>
        <p className="ltr-nums text-2xl font-bold leading-none">{value.toLocaleString('en-US')}</p>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
