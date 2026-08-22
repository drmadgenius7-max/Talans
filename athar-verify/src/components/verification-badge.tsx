import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tone, VerificationResultCode } from '@/lib/types';

const TONE_STYLES: Record<Tone, { wrap: string; icon: string; ring: string }> = {
  success: {
    wrap: 'border-success/25 bg-success/8',
    icon: 'text-success',
    ring: 'bg-success/12',
  },
  warning: {
    wrap: 'border-warning/30 bg-warning/8',
    icon: 'text-warning',
    ring: 'bg-warning/12',
  },
  danger: {
    wrap: 'border-destructive/25 bg-destructive/8',
    icon: 'text-destructive',
    ring: 'bg-destructive/12',
  },
};

const ICONS: Record<VerificationResultCode, typeof ShieldCheck> = {
  VERIFIED_ORIGINAL: ShieldCheck,
  VERIFIED_CONTENT_MATCH: CheckCircle2,
  UNABLE_TO_VERIFY: AlertTriangle,
  NO_MATCH: XCircle,
  ERROR: AlertTriangle,
};

/**
 * The single most important element on the page.
 *
 * A customer arriving from WhatsApp should be able to read the answer without
 * scrolling and without understanding a single technical term. Everything else
 * on the page is supporting detail.
 */
export function VerificationBadge({
  result,
  title,
  message,
  hint,
  className,
  size = 'default',
}: {
  result: VerificationResultCode;
  title: string;
  message: string;
  hint?: string | null;
  className?: string;
  size?: 'default' | 'large';
}) {
  const tone: Tone =
    result === 'VERIFIED_ORIGINAL' || result === 'VERIFIED_CONTENT_MATCH'
      ? 'success'
      : result === 'NO_MATCH'
        ? 'danger'
        : 'warning';

  const styles = TONE_STYLES[tone];
  const Icon = ICONS[result];

  return (
    <div
      className={cn(
        'animate-in-up rounded-[var(--radius)] border p-5 sm:p-6',
        styles.wrap,
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl',
            styles.ring,
            size === 'large' ? 'size-14' : 'size-12',
          )}
        >
          <Icon className={cn(styles.icon, size === 'large' ? 'size-8' : 'size-7')} />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              'font-bold leading-snug text-foreground',
              size === 'large' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl',
            )}
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {message}
          </p>
          {hint && (
            <p className="mt-3 rounded-xl bg-background/60 p-3 text-[13px] leading-relaxed text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
