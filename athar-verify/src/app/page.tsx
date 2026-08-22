import Link from 'next/link';
import { FileCheck2, Fingerprint, ShieldCheck } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/brand';
import { OrderLookup } from '@/components/order-lookup';
import { AI_DISCLAIMER_AR } from '@/lib/analysis/ai/provider';

export const metadata = {
  title: 'تحقق من توثيقك',
};

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="hero-texture border-b border-border/60">
          <div className="container py-12 sm:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" />
                أداة رسمية من متجر أثر
              </span>

              <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                تحقق من توثيقك
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                أدخل رقم طلبك للتحقق من التوثيق ومشاهدة النسخة الأصلية المسجلة لدى متجر أثر.
              </p>
            </div>

            <div className="mx-auto mt-9 max-w-xl">
              <OrderLookup />
            </div>
          </div>
        </section>

        <section className="container py-12">
          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
            <Pillar
              icon={Fingerprint}
              title="بصمة رقمية لكل ملف"
              body="عند استلام التوثيق من فريق أثر نسجّل بصمة SHA-256 فريدة للملف، ولا تتغير بعد ذلك أبدًا."
            />
            <Pillar
              icon={FileCheck2}
              title="مقارنة مع نسختك"
              body="ارفع الفيديو الموجود لديك ليقارن النظام بصمته ومحتواه مع النسخة الأصلية المسجلة."
            />
            <Pillar
              icon={ShieldCheck}
              title="رابط تحقق دائم"
              body="لكل توثيق رابط ورمز QR يمكن الرجوع إليه في أي وقت لعرض حالة الملف الأصلية."
            />
          </div>

          <div className="mx-auto mt-8 max-w-4xl text-center">
            <Link
              href="/how-it-works"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              كيف نتحقق من التوثيق؟
            </Link>
          </div>

          <p className="mx-auto mt-8 max-w-3xl rounded-[var(--radius)] border border-border bg-secondary/40 p-4 text-center text-xs leading-relaxed text-muted-foreground">
            {AI_DISCLAIMER_AR}
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="surface flex flex-col gap-2.5 p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
