'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileUp, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { COUNTRIES, ORDER_STATUS_AR, SERVICE_TYPES } from '@/lib/i18n/countries';
import { formatBytes } from '@/lib/utils';
import type { ApiResponse } from '@/lib/types';

type Stage = 'idle' | 'creating' | 'presigning' | 'uploading' | 'registering' | 'done' | 'error';

type CreatedOrder = {
  order: { id: string; orderNumber: string };
  verification: { verificationId: string; url: string; qrPath: string };
};

/**
 * "إضافة طلب جديد" — order creation and documentation upload in one flow.
 *
 * The video is uploaded straight to object storage using a presigned URL, so a
 * multi-hundred-megabyte field recording never passes through the application
 * server. Only after the bytes land does the browser tell the server to
 * register it, at which point the server reads the object back and computes the
 * SHA-256 itself.
 */
export function NewOrderForm() {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>('idle');
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<CreatedOrder | null>(null);
  const [file, setFile] = React.useState<File | null>(null);

  const busy = stage !== 'idle' && stage !== 'done' && stage !== 'error';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!file) {
      setError('رفع فيديو التوثيق مطلوب.');
      setStage('error');
      return;
    }

    setError(null);

    try {
      // 1. Create the order (and its verification link).
      setStage('creating');
      const orderRes = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderNumber: String(form.get('orderNumber') ?? ''),
          customerName: String(form.get('customerName') ?? '') || null,
          customerPhone: String(form.get('customerPhone') ?? '') || null,
          showCustomerName: form.get('showCustomerName') === 'on',
          countryCode: String(form.get('countryCode') ?? ''),
          serviceType: String(form.get('serviceType') ?? '') || null,
          executionDate: String(form.get('executionDate') ?? ''),
          status: String(form.get('status') ?? 'EXECUTED'),
          notes: String(form.get('notes') ?? '') || null,
        }),
      });
      const orderBody = (await orderRes.json()) as ApiResponse<CreatedOrder>;
      if (!orderBody.ok) throw new Error(orderBody.error.message);
      const order = orderBody.data;

      // 2. Ask for a direct-to-storage upload URL.
      setStage('presigning');
      const presignRes = await fetch('/api/admin/uploads/presign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          size: file.size,
          scope: 'documentation',
        }),
      });
      const presignBody = (await presignRes.json()) as ApiResponse<{
        url: string;
        headers: Record<string, string>;
        method: string;
        key: string;
        ticket: string;
      }>;
      if (!presignBody.ok) throw new Error(presignBody.error.message);

      // 3. Upload the bytes.
      setStage('uploading');
      setProgress(0);
      await uploadWithProgress(presignBody.data.url, presignBody.data.headers, file, setProgress);

      // 4. Register it — the server hashes the stored object.
      setStage('registering');
      const registerRes = await fetch(`/api/admin/orders/${order.order.id}/documentation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ticket: presignBody.data.ticket,
          originalFilename: file.name,
          mimeType: file.type || 'video/mp4',
          kind: 'VIDEO',
          downloadAllowed: form.get('downloadAllowed') === 'on',
          isPrimary: true,
        }),
      });
      const registerBody = (await registerRes.json()) as ApiResponse<unknown>;
      if (!registerBody.ok) throw new Error(registerBody.error.message);

      setCreated(order);
      setStage('done');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
      setStage('error');
    }
  };

  if (stage === 'done' && created) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success">
            <CheckCircle2 className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold">تم حفظ الطلب وإنشاء سجل التحقق</h2>
            <p className="ltr-nums mt-1 text-sm text-muted-foreground">
              رقم الطلب: {created.order.orderNumber}
            </p>
          </div>

          <div className="w-full rounded-xl border border-border bg-secondary/40 p-4 text-start">
            <p className="text-xs font-semibold">رابط التحقق العام</p>
            <code className="ltr-nums mt-1 block break-all text-xs text-muted-foreground">
              {created.verification.url}
            </code>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <a href={`/admin/orders/${created.order.id}`}>عرض الطلب و QR</a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreated(null);
                setFile(null);
                setStage('idle');
                setProgress(0);
              }}
            >
              إضافة طلب آخر
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            جارٍ استخراج البصمة الإدراكية والبيانات التقنية في الخلفية. ستظهر الحالة «جاهز» عند
            الانتهاء.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="رقم الطلب" required htmlFor="orderNumber">
            <Input id="orderNumber" name="orderNumber" required dir="ltr" placeholder="275123456" />
          </Field>

          <Field label="الدولة" required htmlFor="countryCode">
            <Select id="countryCode" name="countryCode" required defaultValue="">
              <option value="" disabled>
                اختر الدولة
              </option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.nameAr}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="تاريخ التنفيذ" required htmlFor="executionDate">
            <Input id="executionDate" name="executionDate" type="date" required dir="ltr" />
          </Field>

          <Field label="نوع الخدمة" htmlFor="serviceType">
            <Select id="serviceType" name="serviceType" defaultValue="">
              <option value="">— غير محدد —</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="اسم العميل (اختياري)" htmlFor="customerName">
            <Input id="customerName" name="customerName" placeholder="اختياري" />
          </Field>

          <Field label="جوال العميل (داخلي، لا يُعرض للعملاء)" htmlFor="customerPhone">
            <Input id="customerPhone" name="customerPhone" dir="ltr" placeholder="اختياري" />
          </Field>

          <Field label="الحالة" htmlFor="status">
            <Select id="status" name="status" defaultValue="EXECUTED">
              {Object.entries(ORDER_STATUS_AR).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col justify-end gap-2.5 pb-1">
            <Checkbox name="showCustomerName" label="إظهار اسم العميل في صفحة التحقق العامة" />
            <Checkbox name="downloadAllowed" label="السماح للعميل بتنزيل الفيديو" defaultChecked />
          </div>

          <div className="sm:col-span-2">
            <Field label="ملاحظات" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={3} placeholder="ملاحظات داخلية عن التنفيذ." />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-bold">
            رفع فيديو التوثيق <span className="text-destructive">*</span>
          </h2>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[calc(var(--radius)-0.2rem)] border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-colors hover:border-primary/40">
            <FileUp className="size-6 text-primary" />
            <span className="text-sm font-semibold">
              {file ? file.name : 'اختر ملف الفيديو الأصلي'}
            </span>
            <span className="ltr-nums text-xs text-muted-foreground">
              {file ? formatBytes(file.size) : 'MP4, MOV, WEBM'}
            </span>
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {stage === 'uploading' && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="ltr-nums mt-1.5 text-xs text-muted-foreground">
                جارٍ الرفع… {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger">
          <AlertDescription className="text-foreground">{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="lg" disabled={busy} className="self-start">
        {busy ? <Loader2 className="animate-spin" /> : <Save />}
        {stage === 'creating'
          ? 'جارٍ حفظ الطلب…'
          : stage === 'presigning'
            ? 'جارٍ تجهيز الرفع…'
            : stage === 'uploading'
              ? 'جارٍ رفع الفيديو…'
              : stage === 'registering'
                ? 'جارٍ حساب البصمة…'
                : 'حفظ وإنشاء سجل التحقق'}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-xs">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-input accent-[hsl(var(--primary))]"
      />
      <span>{label}</span>
    </label>
  );
}

/** PUT with progress reporting — `fetch` still cannot report upload progress. */
function uploadWithProgress(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [key, value] of Object.entries(headers)) {
      // The browser sets Content-Length itself and rejects attempts to set it.
      if (key.toLowerCase() === 'content-length') continue;
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`فشل رفع الملف إلى التخزين (${xhr.status}).`));
    });
    xhr.addEventListener('error', () => reject(new Error('فشل الاتصال أثناء رفع الملف.')));
    xhr.send(file);
  });
}
