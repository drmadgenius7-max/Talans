'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ApiResponse } from '@/lib/types';

/**
 * Deleting an order hides it from customers and deactivates its public link.
 * The typed-confirmation step exists because there is no undo in the UI.
 */
export function OrderDangerZone({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!body.ok) throw new Error(body.error.message);
      router.push('/admin/orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الطلب.');
      setPending(false);
    }
  };

  return (
    <Card className="border-destructive/25">
      <CardContent className="flex flex-col gap-3 p-5">
        <div>
          <h2 className="text-sm font-bold text-destructive">حذف الطلب</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            سيتوقف ظهور الطلب للعملاء ويُعطّل رابط التحقق العام. تُحفظ بصمات الملفات وسجل عمليات
            التحقق للمراجعة.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 sm:max-w-56">
            <label htmlFor="confirm-delete" className="field-label text-xs">
              اكتب رقم الطلب للتأكيد
            </label>
            <Input
              id="confirm-delete"
              dir="ltr"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={orderNumber}
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={confirm.trim() !== orderNumber || pending}
            onClick={remove}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            حذف الطلب
          </Button>
        </div>

        {error && (
          <Alert variant="danger">
            <AlertDescription className="text-foreground">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
