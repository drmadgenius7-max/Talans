import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/brand';
import { Button } from '@/components/ui/button';

export default function VerificationNotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader compact />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-warning/12 text-warning">
          <SearchX className="size-7" />
        </span>
        <h1 className="text-xl font-bold">رابط التحقق غير صالح</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          قد يكون الرابط ناقصًا أو منتهي الصلاحية أو تم إيقافه. يمكنك التحقق من طلبك باستخدام رقم
          الطلب مباشرة.
        </p>
        <Button asChild className="mt-2">
          <Link href="/">التحقق برقم الطلب</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
