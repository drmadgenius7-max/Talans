import { z } from 'zod';
import { NO_STORE, ok, readJson } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';
import { requireApiUser, recordAudit } from '@/lib/auth/guard';
import { requestFingerprint } from '@/lib/security/request';
import { getOrderById, softDeleteOrder, updateOrder } from '@/lib/services/orders';
import { buildVerificationUrl } from '@/lib/qr';
import { COUNTRIES } from '@/lib/i18n/countries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const countryCodes = COUNTRIES.map((c) => c.code);

export const GET = withErrorHandling('admin.orders.get', async (_req: Request, ctx: Params) => {
  await requireApiUser('VIEWER');
  const { id } = await ctx.params;
  const order = await getOrderById(id);

  return ok(
    {
      order,
      verificationLinks: order.verificationLinks.map((link) => ({
        ...link,
        url: buildVerificationUrl(link.verificationId, link.token),
        qrPath: `/api/qr/${link.verificationId}?t=${encodeURIComponent(link.token)}`,
      })),
    },
    NO_STORE,
  );
});

const updateSchema = z.object({
  orderNumber: z.string().min(3).max(64).optional(),
  customerName: z.string().max(160).nullable().optional(),
  customerPhone: z.string().max(40).nullable().optional(),
  showCustomerName: z.boolean().optional(),
  countryCode: z
    .string()
    .length(2)
    .refine((c) => countryCodes.includes(c.toUpperCase()), 'الدولة غير مدعومة.')
    .optional(),
  serviceType: z.string().max(120).nullable().optional(),
  executionDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ التنفيذ غير صالح.')
    .optional(),
  status: z.enum(['PENDING', 'EXECUTED', 'DELIVERED', 'CANCELLED']).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const PATCH = withErrorHandling('admin.orders.update', async (req: Request, ctx: Params) => {
  const user = await requireApiUser('OPERATOR');
  const { ipHash } = requestFingerprint(req);
  const { id } = await ctx.params;
  const input = await readJson(req, updateSchema);

  const order = await updateOrder(id, {
    ...input,
    executionDate: input.executionDate ? new Date(input.executionDate) : undefined,
  });

  await recordAudit({
    adminId: user.id,
    action: 'order.updated',
    entityType: 'Order',
    entityId: id,
    detail: { fields: Object.keys(input) },
    ipHash,
  });

  return ok({ order }, NO_STORE);
});

/**
 * Soft delete. Documentation fingerprints are retained for audit; the public
 * verification link is deactivated so the order stops resolving for customers.
 */
export const DELETE = withErrorHandling('admin.orders.delete', async (req: Request, ctx: Params) => {
  const user = await requireApiUser('ADMIN');
  const { ipHash } = requestFingerprint(req);
  const { id } = await ctx.params;

  const order = await softDeleteOrder(id);
  await recordAudit({
    adminId: user.id,
    action: 'order.deleted',
    entityType: 'Order',
    entityId: id,
    detail: { orderNumber: order.orderNumber },
    ipHash,
  });

  return ok({ deleted: true }, NO_STORE);
});
