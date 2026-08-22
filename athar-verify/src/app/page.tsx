import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { AtharMark } from '@/components/brand';
import { OrderLookup } from '@/components/order-lookup';

export const metadata = {
  title: 'تحقق من توثيقك',
};

/**
 * The customer entry point.
 *
 * Deliberately close to empty. A customer arriving from a WhatsApp link on a
 * phone wants one field and one button, and every extra paragraph pushes the
 * thing they came for below the fold. Explanations live behind a single link.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        <div className="hero-texture">
          <div className="container max-w-xl py-12 sm:py-16">
            <div className="mb-8 flex flex-col items-center gap-4 text-center">
              <span className="text-primary">
                <AtharMark className="size-12" />
              </span>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">تحقق من توثيقك</h1>

              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                أدخل رقم طلبك لمشاهدة التوثيق المسجل لدى متجر أثر.
              </p>
            </div>

            <OrderLookup />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="container flex flex-col items-center gap-2 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ShieldCheck className="size-3.5" />
            كيف نتحقق؟
          </Link>
          <p className="text-[11px] text-muted-foreground">متجر أثر</p>
        </div>
      </footer>
    </div>
  );
}
