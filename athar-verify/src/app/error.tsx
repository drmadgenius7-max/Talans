'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // The full error is already recorded server-side; the digest is the only
    // safe handle to correlate a customer report with a server log line.
    console.error('render_error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-warning/12 text-warning">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="text-xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        تعذر عرض الصفحة. حاول مجددًا، وإذا تكرر الأمر تواصل مع خدمة العملاء.
      </p>
      {error.digest && (
        <code className="ltr-nums rounded bg-secondary px-2 py-1 text-[11px]">{error.digest}</code>
      )}
      <Button onClick={reset}>إعادة المحاولة</Button>
    </div>
  );
}
