import { NO_STORE, ok } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';
import { requireApiUser } from '@/lib/auth/guard';
import { collectStats } from '@/lib/services/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandling('admin.stats', async () => {
  await requireApiUser('VIEWER');
  return ok(await collectStats(), NO_STORE);
});
