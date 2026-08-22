'use client';

import * as React from 'react';
import { Fingerprint } from 'lucide-react';
import { CopyButton } from '@/components/copy-button';
import { shortHash } from '@/lib/utils';

/**
 * The digital fingerprint panel.
 *
 * Shows the truncated hash by default (8d42f98e…a9213) because the full 64
 * characters are noise to most customers, with the complete value one tap away
 * for anyone who wants to verify it themselves with `sha256sum`.
 */
export function FingerprintPanel({
  sha256,
  registeredAt,
  className,
}: {
  sha256: string;
  registeredAt?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={className}>
      <div className="rounded-[calc(var(--radius)-0.2rem)] border border-border bg-secondary/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Fingerprint className="size-4 text-primary" />
          <span>البصمة الرقمية للملف الأصلي</span>
        </div>

        <p className="mt-3 font-mono text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-sans font-medium text-foreground">SHA-256: </span>
          <span className="ltr-nums select-all break-all">
            {expanded ? sha256 : shortHash(sha256)}
          </span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            aria-expanded={expanded}
          >
            {expanded ? 'إخفاء البصمة الكاملة' : 'عرض البصمة كاملة'}
          </button>
          <CopyButton value={sha256} label="نسخ البصمة" />
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          تم حفظ هذه البصمة عند رفع الملف
          {registeredAt ? ` بتاريخ ${registeredAt}` : ''} ولا يمكن تغييرها بعد التسجيل.
        </p>
      </div>
    </div>
  );
}
