import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/brand';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AI_DISCLAIMER_AR } from '@/lib/analysis/ai/provider';

export const metadata = {
  title: 'كيف نتحقق من التوثيق؟',
  description: 'شرح آلية عمل نظام أثر للتحقق من أصالة فيديوهات التوثيق.',
};

const STEPS = [
  {
    n: '١',
    title: 'تسجيل البصمة عند الاستلام',
    body:
      'عند استلام التوثيق من فريق أثر نقوم بتسجيل بصمة رقمية فريدة للملف. يمكن استخدام هذه البصمة ' +
      'لاحقًا للتحقق من أن الملف لم يتم تغييره.',
  },
  {
    n: '٢',
    title: 'مقارنة البصمة',
    body:
      'عندما ترفع نسختك، يحسب النظام بصمة SHA-256 لملفك ويقارنها بالبصمة المسجلة. إذا تطابقت ' +
      'البصمتان فهذه أقوى حالة تحقق ممكنة: الملف مطابق تمامًا بايت ببايت.',
  },
  {
    n: '٣',
    title: 'تحليل تشابه المحتوى',
    body:
      'قد تختلف البصمة إذا تم ضغط الفيديو بواسطة تطبيقات مثل واتساب، لذلك يستخدم النظام أيضًا ' +
      'تحليل التشابه بين المحتوى: يستخرج إطارات من الفيديو ويحسب لها بصمة إدراكية، ويقارن ' +
      'البصمة الصوتية والمدة، ثم يعطي درجة تشابه.',
  },
  {
    n: '٤',
    title: 'مؤشرات إضافية',
    body:
      'يفحص النظام البيانات التقنية للملف واتساق الإطارات ومؤشرات التوليد الاصطناعي. هذه ' +
      'المؤشرات مساعدة فقط، ولا تُستخدم وحدها للحكم على أي ملف.',
  },
];

const CASES = [
  {
    tone: 'success' as const,
    badge: '🟢',
    title: 'Verified Original',
    body: 'الملف مطابق للنسخة الأصلية المسجلة لدى متجر أثر.',
  },
  {
    tone: 'success' as const,
    badge: '🟢',
    title: 'Verified Content Match',
    body:
      'الملف مختلف تقنيًا عن النسخة الأصلية ولكنه يتطابق بدرجة عالية مع محتوى التوثيق المسجل — ' +
      'كما يحدث عند إرساله عبر واتساب.',
  },
  {
    tone: 'warning' as const,
    badge: '🟡',
    title: 'Unable to Fully Verify',
    body: 'لم نتمكن من تأكيد مطابقة الملف بشكل كامل.',
  },
  {
    tone: 'danger' as const,
    badge: '🔴',
    title: 'File Does Not Match',
    body: 'الملف لا يتطابق مع التوثيق الأصلي المرتبط بهذا الطلب.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader compact />

      <main className="flex-1">
        <div className="container max-w-3xl py-12">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">كيف نتحقق من التوثيق؟</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            نظام أثر للتحقق يعتمد بشكل أساسي على مطابقة الملف مع النسخة الأصلية المسجلة لدينا، لا
            على أدوات كشف الذكاء الاصطناعي.
          </p>

          <ol className="mt-9 flex flex-col gap-4">
            {STEPS.map((step) => (
              <li key={step.n}>
                <Card>
                  <CardContent className="flex gap-4 p-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
                      {step.n}
                    </span>
                    <div>
                      <h2 className="text-sm font-bold">{step.title}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 text-xl font-bold tracking-tight">حالات النتيجة الأربع</h2>
          <div className="mt-4 flex flex-col gap-3">
            {CASES.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-[calc(var(--radius)-0.2rem)] border border-border bg-card p-4"
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {item.badge}
                </span>
                <div>
                  <h3 className="ltr-nums text-sm font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <Alert variant="info" className="mt-8">
            <AlertDescription className="text-xs leading-relaxed text-foreground">
              {AI_DISCLAIMER_AR}
            </AlertDescription>
          </Alert>

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              <ArrowLeft className="size-4 rotate-180" />
              العودة للتحقق من طلبك
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
