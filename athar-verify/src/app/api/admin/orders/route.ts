import { z } from 'zod';
import { NO_STORE, ok, readJson, readQuery } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';
import { requireApiUser, recordAudit } from '@/lib/auth/guard';
import { requestFingerprint } from '@/lib/security/request';
import { createOrder, listOrders } from '@/lib/services/orders';
import { COUNTRIES } from '@/lib/i18n/countries';
import { buildVerificationUrl } from '@/lib/qr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const listSchema = z.object({
  search: z.string().max(120).optional(),
  countryCode: z.string().length(2).optional(),
  status: z.enum(['PENDING', 'EXECUTED', 'DELIVERED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withErrorHandling('admin.orders.list', async (req: Request) => {
  await requireApiUser('VIEWER');
  const query = readQuery(req, listSchema);

  const result = await listOrders({
    search: query.search,
    countryCode: query.countryCode,
    status: query.status,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
    includeDeleted: query.includeDeleted === 'true',
    page: query.page,
    pageSize: query.pageSize,
  });

  return ok(result, NO_STORE);
});

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];

const createSchema = z.object({
  orderNumber: z.string().min(3, 'رقم الطلب مطلوب.').max(64),
  customerName: z.string().max(160).optional().nullable(),
  customerPhone: z.string().max(40).optional().nullable(),
  showCustomerName: z.boolean().optional(),
  countryCode: z.string().length(2).refine((c) => countryCodes.includes(c.toUpperCase()), {
    message: 'الدولة غير مدعومة.',
  }),
  serviceType: z.string().max(120).optional().nullable(),
  executionDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ التنفيذ غير صالح.'),
  status: z.enum(['PENDING', 'EXECUTED', 'DELIVERED', 'CANCELLED']).optional(),
  notes: z.string().max(4000).optional().nullable(),
});

/** Creates the order and its verification link in one step. */
export const POST = withErrorHandling('admin.orders.create', async (req: Request) => {
  const user = await requireApiUser('OPERATOR');
  const { ipHash } = requestFingerprint(req);
  const input = await readJson(req, createSchema);

  const { order, link } = await createOrder({
    ...input,
    countryCode: input.countryCode.toUpperCase(),
    executionDate: new Date(input.executionDate),
    createdById: user.id,
  });

  await recordAudit({
    adminId: user.id,
    action: 'order.created',
    entityType: 'Order',
    entityId: order.id,
    detail: { orderNumber: order.orderNumber },
    ipHash,
  });

  return ok(
    {
      order,
      verification: {
        verificationId: link.verificationId,
        token: link.token,
        url: buildVerificationUrl(link.verificationId, link.token),
        qrPath: `/api/qr/${link.verificationId}?t=${encodeURIComponent(link.token)}`,
      },
    },
    { ...NO_STORE, status: 201 },
  );
});
