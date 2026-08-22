import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NewOrderForm } from '@/components/admin/new-order-form';
import { requirePageUser } from '@/lib/auth/guard';

export const metadata = { title: 'إضافة طلب' };

export default async function NewOrderPage() {
  await requirePageUser('OPERATOR', '/admin/orders/new');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 rotate-180" />
          الطلبات
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight">إضافة طلب جديد</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          سيتم حساب بصمة SHA-256 للفيديو وإنشاء رابط تحقق و QR Code تلقائيًا بعد الحفظ.
        </p>
      </div>

      <NewOrderForm />
    </div>
  );
}
