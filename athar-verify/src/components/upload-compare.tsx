'use client';

import * as React from 'react';
import { FileUp, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VerificationBadge } from '@/components/verification-badge';
import { CheckReport } from '@/components/check-report';
import { formatBytes } from '@/lib/utils';
import type { ApiResponse, CheckStatusDto } from '@/lib/types';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * "هل لديك نسخة من الفيديو؟ تحقق منها"
 *
 * Uploads the customer's copy, then polls until the comparison finishes. An
 * exact fingerprint match comes back on the upload response itself, so the
 * common case resolves in one round trip with no polling at all.
 */
export function UploadCompare({
  orderNumber,
  originalSha256,
}: {
  orderNumber: string;
  originalSha256: string;
}) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [check, setCheck] = React.useState<CheckStatusDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      abortRef.current?.abort();
      if (pollRef.current) clearTimeout(pollRef.current);
    },
    [],
  );

  const reset = () => {
    abortRef.current?.abort();
    if (pollRef.current) clearTimeout(pollRef.current);
    setPhase('idle');
    setFile(null);
    setProgress(0);
    setCheck(null);
    setError(null);
  };

  const poll = React.useCallback((checkId: string, startedAt: number) => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/public/checks/${checkId}`, { cache: 'no-store' });
        const body = (await res.json()) as ApiResponse<CheckStatusDto>;

        if (!body.ok) throw new Error(body.error.message);

        if (body.data.status === 'READY' || body.data.status === 'FAILED') {
          setCheck(body.data);
          setPhase('done');
          return;
        }

        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setError('استغرقت المعالجة وقتًا أطول من المتوقع. حاول مرة أخرى بعد قليل.');
          setPhase('error');
          return;
        }

        pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر متابعة حالة الفحص.');
        setPhase('error');
      }
    };

    pollRef.current = setTimeout(tick, POLL_INTERVAL_MS);
  }, []);

  const submit = React.useCallback(
    (selected: File) => {
      setFile(selected);
      setError(null);
      setCheck(null);
      setProgress(0);
      setPhase('uploading');

      const form = new FormData();
      form.append('orderNumber', orderNumber);
      form.append('file', selected);

      // XHR rather than fetch: it is the only way to report real upload
      // progress, which matters a lot on a mobile connection.
      const xhr = new XMLHttpRequest();
      const controller = new AbortController();
      abortRef.current = controller;
      controller.signal.addEventListener('abort', () => xhr.abort());

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        let body: ApiResponse<{ checkId: string; status: string; immediate: boolean }>;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          setError('استجابة غير متوقعة من الخادم.');
          setPhase('error');
          return;
        }

        if (!body.ok) {
          setError(body.error.message);
          setPhase('error');
          return;
        }

        setPhase('processing');

        if (body.data.immediate) {
          void fetch(`/api/public/checks/${body.data.checkId}`, { cache: 'no-store' })
            .then((r) => r.json())
            .then((result: ApiResponse<CheckStatusDto>) => {
              if (result.ok) {
                setCheck(result.data);
                setPhase('done');
              } else {
                setError(result.error.message);
                setPhase('error');
              }
            })
            .catch(() => {
              setError('تعذر جلب نتيجة الفحص.');
              setPhase('error');
            });
          return;
        }

        poll(body.data.checkId, Date.now());
      });

      xhr.addEventListener('error', () => {
        setError('فشل رفع الملف. تحقق من اتصالك بالإنترنت وحاول مجددًا.');
        setPhase('error');
      });

      xhr.open('POST', '/api/public/verify-upload');
      xhr.send(form);
    },
    [orderNumber, poll],
  );

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <Card className="animate-in-up">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h3 className="text-base font-bold">هل لديك نسخة من الفيديو؟ تحقق منها</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            ارفع النسخة الموجودة لديك وسنقارن بصمتها الرقمية مع النسخة الأصلية المسجلة لدينا. لا
            نحتفظ بالملف الذي ترفعه — يُحذف فور انتهاء الفحص.
          </p>
        </div>

        {phase === 'idle' && (
          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[calc(var(--radius)-0.2rem)] border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:border-primary/40 hover:bg-secondary/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) submit(dropped);
            }}
          >
            <FileUp className="size-7 text-primary" />
            <span className="text-sm font-semibold">اختر ملف الفيديو أو اسحبه إلى هنا</span>
            <span className="text-xs text-muted-foreground">MP4, MOV, WEBM — حتى 300 ميجابايت</span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) submit(selected);
              }}
            />
          </label>
        )}

        {busy && (
          <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-0.2rem)] border border-border bg-secondary/30 p-5">
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-primary" />
              {phase === 'uploading' ? `جارٍ رفع الملف… ${progress}%` : 'جارٍ تحليل الملف ومقارنته…'}
            </div>

            {phase === 'uploading' && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {file && (
              <p className="truncate text-xs text-muted-foreground">
                {file.name} — {formatBytes(file.size)}
              </p>
            )}

            {phase === 'processing' && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                نستخرج الإطارات والبصمة الصوتية ونقارنها بالتوثيق الأصلي. قد يستغرق هذا دقيقة أو
                أكثر حسب طول الفيديو.
              </p>
            )}
          </div>
        )}

        {phase === 'error' && error && (
          <Alert variant="danger">
            <AlertDescription className="text-foreground">{error}</AlertDescription>
          </Alert>
        )}

        {phase === 'done' && check && (
          <CheckReport check={check} originalSha256={originalSha256} />
        )}

        {(phase === 'done' || phase === 'error') && (
          <Button type="button" variant="outline" onClick={reset} className="self-start">
            <RotateCcw />
            فحص ملف آخر
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { VerificationBadge };
