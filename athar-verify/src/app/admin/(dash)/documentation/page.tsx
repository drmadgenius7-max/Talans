import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { prisma } from '@/lib/db/prisma';
import { countryLabel, PROCESSING_STATUS_AR } from '@/lib/i18n/countries';
import { formatBytes, formatDateTimeAr, formatDuration, shortHash } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'التوثيقات' };

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

const STATUSES = ['PENDING', 'PROCESSING', 'READY', 'FAILED'] as const;

export default async function DocumentationPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const pageSize = 30;

  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : undefined;

  const where = { deletedAt: null, ...(status ? { processingStatus: status } : {}) };

  const [items, total, counts] = await Promise.all([
    prisma.documentation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        order: { select: { id: true, orderNumber: true, countryCode: true, countryNameAr: true } },
        uploadedBy: { select: { name: true } },
      },
    }),
    prisma.documentation.count({ where }),
    prisma.documentation.groupBy({
      by: ['processingStatus'],
      _count: { _all: true },
      where: { deletedAt: null },
    }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.processingStatus, c._count._all]));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">التوثيقات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString('en-US')} ملف توثيق مسجل ببصمة رقمية.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip href="/admin/documentation" label="الكل" active={!status} />
        {STATUSES.map((value) => (
          <Chip
            key={value}
            href={`/admin/documentation?status=${value}`}
            label={`${PROCESSING_STATUS_AR[value]} (${byStatus[value] ?? 0})`}
            active={status === value}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد ملفات توثيق مطابقة.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>الملف</TableHead>
                  <TableHead>البصمة</TableHead>
                  <TableHead>الحجم</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>رفع بواسطة</TableHead>
                  <TableHead>تاريخ الرفع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="ltr-nums font-medium">
                      <Link
                        href={`/admin/orders/${doc.orderId}`}
                        className="text-primary hover:underline"
                      >
                        {doc.order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {countryLabel(doc.order.countryCode, doc.order.countryNameAr)}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs" title={doc.originalFilename}>
                      {doc.originalFilename}
                    </TableCell>
                    <TableCell className="ltr-nums font-mono text-[11px]">
                      {shortHash(doc.sha256)}
                    </TableCell>
                    <TableCell className="ltr-nums whitespace-nowrap text-xs">
                      {formatBytes(doc.filesize)}
                    </TableCell>
                    <TableCell className="ltr-nums text-xs">
                      {formatDuration(doc.durationSeconds)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {doc.uploadedBy?.name ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTimeAr(doc.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/admin/documentation?${status ? `status=${status}&` : ''}page=${page - 1}`}
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
              href={`/admin/documentation?${status ? `status=${status}&` : ''}page=${page + 1}`}
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

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
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
