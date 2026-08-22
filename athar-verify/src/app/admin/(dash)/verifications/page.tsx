import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { prisma } from '@/lib/db/prisma';
import { collectStats } from '@/lib/services/stats';
import { resultCopy } from '@/lib/analysis/verdict';
import { AI_RISK_AR, CHECK_SOURCE_AR } from '@/lib/i18n/countries';
import { formatBytes, formatDateTimeAr, shortHash } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'عمليات التحقق' };

type Props = { searchParams: Promise<{ result?: string; source?: string; page?: string }> };

const RESULTS = [
  'VERIFIED_ORIGINAL',
  'VERIFIED_CONTENT_MATCH',
  'UNABLE_TO_VERIFY',
  'NO_MATCH',
  'ERROR',
] as const;

export default async function VerificationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 30;

  const resultFilter = RESULTS.includes(params.result as (typeof RESULTS)[number])
    ? (params.result as (typeof RESULTS)[number])
    : undefined;
  const includeLookups = params.source === 'LOOKUP';

  const where = {
    ...(resultFilter ? { result: resultFilter } : {}),
    ...(includeLookups ? { source: 'LOOKUP' as const } : { source: { not: 'LOOKUP' as const } }),
  };

  const [stats, checks, total] = await Promise.all([
    collectStats(),
    prisma.verificationCheck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { order: { select: { id: true, orderNumber: true } } },
    }),
    prisma.verificationCheck.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">عمليات التحقق</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.uploadsTotal.toLocaleString('en-US')} عملية رفع من العملاء و{' '}
          {stats.lookupsTotal.toLocaleString('en-US')} استعلام برقم الطلب.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/admin/verifications" label="الكل" active={!resultFilter && !includeLookups} />
        {RESULTS.map((value) => (
          <FilterChip
            key={value}
            href={`/admin/verifications?result=${value}`}
            label={resultCopy(value).badge}
            active={resultFilter === value}
          />
        ))}
        <FilterChip
          href="/admin/verifications?source=LOOKUP"
          label="الاستعلامات"
          active={includeLookups}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {checks.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد سجلات مطابقة.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>النتيجة</TableHead>
                  <TableHead>البصمة</TableHead>
                  <TableHead>التشابه</TableHead>
                  <TableHead>الصوت</TableHead>
                  <TableHead>مؤشرات AI</TableHead>
                  <TableHead>درجة التحقق</TableHead>
                  <TableHead>الملف المرفوع</TableHead>
                  <TableHead>المصدر</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check) => {
                  const copy = resultCopy(check.result);
                  return (
                    <TableRow key={check.id}>
                      <TableCell className="ltr-nums font-medium">
                        {check.order ? (
                          <Link
                            href={`/admin/orders/${check.order.id}`}
                            className="text-primary hover:underline"
                          >
                            {check.order.orderNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
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
                      <TableCell>
                        {check.hashMatch ? (
                          <Badge variant="success">مطابقة</Badge>
                        ) : check.source === 'LOOKUP' ? (
                          '—'
                        ) : (
                          <Badge variant="muted">مختلفة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.similarityScore != null ? `${check.similarityScore.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.audioSimilarity != null ? `${check.audioSimilarity.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {check.aiRiskLevel ? AI_RISK_AR[check.aiRiskLevel] ?? check.aiRiskLevel : '—'}
                      </TableCell>
                      <TableCell className="ltr-nums">
                        {check.confidenceScore != null ? `${check.confidenceScore.toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {check.uploadedFileHash ? (
                          <span className="ltr-nums font-mono">
                            {shortHash(check.uploadedFileHash)}
                            {check.uploadedFilesize
                              ? ` · ${formatBytes(check.uploadedFilesize)}`
                              : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {CHECK_SOURCE_AR[check.source]}
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

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link
              href={buildPageLink(params, page - 1)}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold"
            >
              السابق
            </Link>
          )}
          <span className="ltr-nums text-xs text-muted-foreground">
            {page} / {pageCount}
          </span>
          {page < pageCount && (
            <Link
              href={buildPageLink(params, page + 1)}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold"
            >
              التالي
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function buildPageLink(params: Record<string, string | undefined>, target: number) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== 'page') qs.set(key, value);
  }
  qs.set('page', String(target));
  return `/admin/verifications?${qs.toString()}`;
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
