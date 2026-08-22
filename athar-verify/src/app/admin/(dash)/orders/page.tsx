import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderFilters } from '@/components/admin/order-filters';
import { listOrders } from '@/lib/services/orders';
import { countryLabel, ORDER_STATUS_AR, PROCESSING_STATUS_AR } from '@/lib/i18n/countries';
import { formatDateAr } from '@/lib/utils';
import type { OrderStatus } from '@prisma/client';

export const metadata = { title: 'الطلبات' };

type Props = {
  searchParams: Promise<{
    search?: string;
    countryCode?: string;
    status?: string;
    page?: string;
  }>;
};

const STATUSES: OrderStatus[] = ['PENDING', 'EXECUTED', 'DELIVERED', 'CANCELLED'];

export default async function AdminOrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : undefined;

  const result = await listOrders({
    search: params.search,
    countryCode: params.countryCode || undefined,
    status,
    page: params.page ? Number(params.page) : 1,
    pageSize: 25,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">الطلبات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString('en-US')} طلب مسجل.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">
            <Plus />
            إضافة طلب
          </Link>
        </Button>
      </div>

      <OrderFilters
        defaultSearch={params.search ?? ''}
        defaultCountry={params.countryCode ?? ''}
        defaultStatus={params.status ?? ''}
      />

      <Card>
        <CardContent className="p-0">
          {result.items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">لا توجد طلبات مطابقة للبحث.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>الدولة</TableHead>
                  <TableHead>تاريخ التنفيذ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التوثيق</TableHead>
                  <TableHead>عمليات التحقق</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((order) => {
                  const primary = order.documentation.find((d) => d.isPrimary) ?? order.documentation[0];
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="ltr-nums font-semibold">{order.orderNumber}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {countryLabel(order.countryCode, order.countryNameAr)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateAr(order.executionDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'CANCELLED' ? 'muted' : 'success'}>
                          {ORDER_STATUS_AR[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {primary ? (
                          <Badge
                            variant={
                              primary.processingStatus === 'READY'
                                ? 'success'
                                : primary.processingStatus === 'FAILED'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {PROCESSING_STATUS_AR[primary.processingStatus]}
                          </Badge>
                        ) : (
                          <Badge variant="muted">بدون فيديو</Badge>
                        )}
                      </TableCell>
                      <TableCell className="ltr-nums text-sm">
                        {order._count.verificationChecks}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          تفاصيل
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {result.pageCount > 1 && (
        <Pagination page={result.page} pageCount={result.pageCount} params={params} />
      )}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  params,
}: {
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
}) {
  const link = (target: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') qs.set(key, value);
    }
    qs.set('page', String(target));
    return `/admin/orders?${qs.toString()}`;
  };

  return (
    <nav className="flex items-center justify-center gap-2 text-sm" aria-label="التنقل بين الصفحات">
      {page > 1 && (
        <Button asChild variant="outline" size="sm">
          <Link href={link(page - 1)}>السابق</Link>
        </Button>
      )}
      <span className="ltr-nums px-3 text-xs text-muted-foreground">
        {page} / {pageCount}
      </span>
      {page < pageCount && (
        <Button asChild variant="outline" size="sm">
          <Link href={link(page + 1)}>التالي</Link>
        </Button>
      )}
    </nav>
  );
}
