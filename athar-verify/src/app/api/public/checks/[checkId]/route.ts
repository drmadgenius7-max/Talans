import { NO_STORE, ok } from '@/lib/api';
import { withErrorHandling } from '@/lib/errors';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { requestFingerprint } from '@/lib/security/request';
import { getCheckStatus } from '@/lib/services/verification';
import { AI_DISCLAIMER_AR } from '@/lib/analysis/ai';
import { CONFIDENCE_EXPLANATION_AR } from '@/lib/analysis/verdict';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ checkId: string }> };

/**
 * Polled by the customer's browser while a comparison runs.
 *
 * Only the report is returned — never the storage key of the uploaded copy,
 * which is deleted as soon as the check completes.
 */
export const GET = withErrorHandling('public.checkStatus', async (req: Request, ctx: Params) => {
  const { ipHash } = requestFingerprint(req);
  await enforcePolicy(RateLimits.publicView(ipHash ?? 'anonymous'));

  const { checkId } = await ctx.params;
  const check = await getCheckStatus(checkId);

  const report = (check.reportJson ?? null) as Record<string, unknown> | null;
  if (report && 'candidateKey' in report) delete report.candidateKey;

  return ok(
    {
      id: check.id,
      status: check.processingStatus,
      result: check.result,
      hashMatch: check.hashMatch,
      confidenceScore: check.confidenceScore,
      similarityScore: check.similarityScore,
      audioSimilarity: check.audioSimilarity,
      aiSignalScore: check.aiSignalScore,
      aiRiskLevel: check.aiRiskLevel,
      report,
      createdAt: check.createdAt,
      completedAt: check.completedAt,
      error: check.processingError,
      disclaimerAr: AI_DISCLAIMER_AR,
      confidenceExplanationAr: CONFIDENCE_EXPLANATION_AR,
    },
    NO_STORE,
  );
});
