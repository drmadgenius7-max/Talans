import { z } from 'zod';
import { NO_STORE, ok, readJson } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { requestFingerprint } from '@/lib/security/request';
import { loadOrderView, recordLookup } from '@/lib/services/verification';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  orderNumber: z.string().min(3, 'رقم الطلب قصير جدًا.').max(64),
});

/**
 * Customer-facing order lookup.
 *
 * Rate limited on two windows (per minute and per day) because an order number
 * is the only thing standing between a stranger and a customer's documentation
 * page. The response is identical in shape whether the order exists or not is
 * *not* attempted here — a 404 is honest — but the daily cap makes walking the
 * number space impractical.
 */
export const POST = withErrorHandling('public.lookup', async (req: Request) => {
  const { ipHash, userAgent } = requestFingerprint(req);
  const bucket = ipHash ?? 'anonymous';

  await enforcePolicy(RateLimits.lookup(bucket));
  await enforcePolicy(RateLimits.lookupDaily(bucket));

  const { orderNumber } = await readJson(req, schema);
  const view = await loadOrderView(orderNumber);

  if (!view) {
    logger.info('lookup_miss', { ipHash });
    return ok({ found: false as const }, { ...NO_STORE, status: 404 });
  }

  void recordLookup({ orderId: view.orderId, ipHash, userAgent });

  return ok({ found: true as const, ...view.payload }, NO_STORE);
});
