'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ApiResponse } from '@/lib/types';

export function DocumentationActions({
  documentationId,
  downloadAllowed,
  canManage,
}: {
  documentationId: string;
  downloadAllowed: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<'reprocess' | 'toggle' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!canManage) return null;

  const call = async (kind: 'reprocess' | 'toggle') => {
    setPending(kind);
    setError(null);
    try {
      const res =
        kind === 'reprocess'
          ? await fetch(`/api/admin/documentation/${documentationId}/reprocess`, { method: 'POST' })
          : await fetch(`/api/admin/documentation/${documentationId}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ downloadAllowed: !downloadAllowed }),
            });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!body.ok) throw new Error(body.error.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="text-[11px] text-destructive">{error}</span>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending !== null}
        onClick={() => call('toggle')}
      >
        {pending === 'toggle' ? <Loader2 className="animate-spin" /> : null}
        {downloadAllowed ? 'منع التنزيل' : 'السماح بالتنزيل'}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending !== null}
        onClick={() => call('reprocess')}
      >
        {pending === 'reprocess' ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        إعادة المعالجة
      </Button>
    </div>
  );
}
