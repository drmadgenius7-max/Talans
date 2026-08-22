import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <SearchX className="size-7" />
      </span>
      <h1 className="text-xl font-bold">الصفحة غير موجودة</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        الرابط الذي فتحته غير صحيح أو تم نقله.
      </p>
      <Button asChild>
        <Link href="/">العودة للصفحة الرئيسية</Link>
      </Button>
    </div>
  );
}
