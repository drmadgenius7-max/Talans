'use client';

import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Copies a value, with a graceful fallback where the clipboard API is blocked. */
export function CopyButton({
  value,
  label = 'نسخ',
  className,
  size = 'sm',
}: {
  value: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default' | 'icon';
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older mobile browsers and insecure contexts have no clipboard API.
      const el = document.createElement('textarea');
      el.value = value;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(el);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [value]);

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={copy}
      className={cn('gap-1.5', className)}
      aria-live="polite"
    >
      {copied ? <Check className="text-success" /> : <Copy />}
      <span>{copied ? 'تم النسخ' : label}</span>
    </Button>
  );
}
