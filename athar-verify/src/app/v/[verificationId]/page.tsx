import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/brand';
import { OrderResult } from '@/components/order-result';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppError } from '@/lib/errors';
import { loadVerificationLinkView } from '@/lib/services/verification';
import { enforcePolicy, RateLimits } from '@/lib/security/ratelimit';
import { serverRequestFingerprint } from '@/lib/security/request';
import { AI_DISCLAIMER_AR } from '@/lib/analysis/ai/provider';
import type { PublicOrderViewDto } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Athar Verified Documentation',
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ verificationId: string }>;
  searchParams: Promise<{ t?: string }>;
};

/**
 * The page a QR scan lands on.
 *
 * Rendered on the server so the answer is present in the first paint — someone
 * scanning a code on a certificate should not watch a spinner. Access requires
 * the token in the query string; without it the page is a 404, identical to a
 * verification id that does not exist.
 */
export default async function PublicVerificationPage({ params, searchParams }: Props) {
  const { verificationId } = await params;
  const { t } = await searchParams;

  const { ipHash } = await serverRequestFingerprint();
  await enforcePolicy(RateLimits.publicView(ipHash ?? 'anonymous'));

  let view;
  try {
    view = await loadVerificationLinkView(verificationId, t ?? null);
  } catch (err) {
    if (err instanceof AppError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  // The presenter already returns a plain, serialisable shape, and `payload`
  // deliberately excludes internal identifiers.
  const dto = view.payload as unknown as PublicOrderViewDto;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader compact />

      <main className="flex-1">
        <div className="container max-w-2xl py-10">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </span>
            <h1 className="ltr-nums text-lg font-bold tracking-tight">
              Athar Verified Documentation
            </h1>
            <p className="text-xs text-muted-foreground">
              رقم التحقق:{' '}
              <span className="ltr-nums font-semibold">{verificationId}</span>
            </p>
          </div>

          <OrderResult view={dto} />

          <Alert variant="info" className="mt-6">
            <AlertDescription className="text-xs leading-relaxed text-foreground">
              {AI_DISCLAIMER_AR}
            </AlertDescription>
          </Alert>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/how-it-works" className="font-semibold text-primary hover:underline">
              كيف نتحقق من التوثيق؟
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
