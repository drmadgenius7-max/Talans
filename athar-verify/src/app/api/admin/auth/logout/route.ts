import { NO_STORE, ok } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';
import { getSessionUser, revokeCurrentSession } from '@/lib/auth/session';
import { recordAudit } from '@/lib/auth/guard';
import { requestFingerprint } from '@/lib/security/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrorHandling('admin.logout', async (req: Request) => {
  const user = await getSessionUser();
  const { ipHash } = requestFingerprint(req);
  await revokeCurrentSession();
  if (user) await recordAudit({ adminId: user.id, action: 'logout', ipHash });
  return ok({ loggedOut: true }, NO_STORE);
});
