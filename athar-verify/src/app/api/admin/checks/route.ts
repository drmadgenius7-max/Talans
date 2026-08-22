import { z } from 'zod';
import { NO_STORE, ok, readQuery } from '@/lib/api';
import { prisma } from '@/lib/db/prisma';
import { withErrorHandling } from '@/lib/errors';
import { requireApiUser } from '@/lib/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  result: z
    .enum(['VERIFIED_ORIGINAL', 'VERIFIED_CONTENT_MATCH', 'UNABLE_TO_VERIFY', 'NO_MATCH', 'ERROR'])
    .optional(),
  source: z.enum(['CUSTOMER_UPLOAD', 'ADMIN_UPLOAD', 'LOOKUP']).optional(),
  orderNumber: z.string().max(64).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** The "سجل عمليات التحقق" list. */
export const GET = withErrorHandling('admin.checks.list', async (req: Request) => {
  await requireApiUser('VIEWER');
  const query = readQuery(req, schema);

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;

  const where = {
    ...(query.result ? { result: query.result } : {}),
    ...(query.source ? { source: query.source } : { source: { not: 'LOOKUP' as const } }),
    ...(query.orderNumber
      ? { order: { orderNumber: { contains: query.orderNumber.toUpperCase() } } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.verificationCheck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { order: { select: { orderNumber: true, countryCode: true } } },
    }),
    prisma.verificationCheck.count({ where }),
  ]);

  return ok(
    {
      items: items.map((check) => ({
        ...check,
        uploadedFilesize: check.uploadedFilesize?.toString() ?? null,
      })),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
    NO_STORE,
  );
});
