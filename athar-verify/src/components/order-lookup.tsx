'use client';

import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrderResult } from '@/components/order-result';
import type { ApiResponse, PublicOrderViewDto } from '@/lib/types';

/**
 * The order-number entry point.
 *
 * Results render in place rather than navigating: it keeps order numbers out of
 * browser history and out of any link the customer might later share, and it is
 * faster on the mobile connections most of these customers arrive on.
 */
export function OrderLookup() {
  const [orderNumber, setOrderNumber] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<PublicOrderViewDto | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      setError('أدخل رقم الطلب أولًا.');
      return;
    }

    setLoading(true);
    setError(null);
    setView(null);

    try {
      const res = await fetch('/api/public/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber: trimmed }),
        cache: 'no-store',
      });
      const body = (await res.json()) as ApiResponse<
        { found: true } & PublicOrderViewDto
      >;

      if (!body.ok) {
        setError(
          res.status === 404
            ? 'لم نعثر على توثيق مرتبط بهذا الرقم. تأكد من الرقم أو تواصل مع خدمة العملاء.'
            : body.error.message,
        );
        return;
      }

      setView(body.data);
      // Give the browser a frame to paint before scrolling to the result.
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    } catch {
      setError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجددًا.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className="surface flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <label htmlFor="order-number" className="field-label">
            رقم الطلب
          </label>
          <Input
            id="order-number"
            name="orderNumber"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="مثال: 275123456"
            inputMode="text"
            autoComplete="off"
            enterKeyHint="search"
            dir="ltr"
            className="text-center font-mono text-lg tracking-wide"
            disabled={loading}
            aria-describedby="order-number-help"
          />
          <p id="order-number-help" className="mt-2 text-xs text-muted-foreground">
            تجده في رسالة تأكيد الطلب أو في صفحة طلباتك لدى متجر أثر.
          </p>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          {loading ? 'جارٍ البحث…' : 'تحقق من الطلب'}
        </Button>

        {error && (
          <Alert variant="warning" role="status">
            <AlertDescription className="text-foreground">{error}</AlertDescription>
          </Alert>
        )}
      </form>

      <div ref={resultRef}>{view && <OrderResult view={view} />}</div>
    </div>
  );
}
