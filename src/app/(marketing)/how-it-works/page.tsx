import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "كيف تعمل قِطّة؟" };

const flows = [
  {
    title: "دفعت عنكم",
    subtitle: "لما تدفع فاتورة كاملة وتبي تسترد حصص أصحابك",
    steps: [
      "أنشئ مصروف واختر أنك أنت من دفع",
      "قسّم المبلغ بالطريقة المناسبة (تساوي، مبلغ محدد، نسبة، حصص، أو حسب العناصر)",
      "قِطّة تنشئ مطالبات تلقائيًا وتولّد رابط دفع لكل شخص",
      "أرسل الروابط عبر واتساب أو أي وسيلة",
      "لما يدفعون، رصيدك يتحدث تلقائيًا",
    ],
  },
  {
    title: "الدفع التشاركي",
    subtitle: "لما تبون تجمعون مبلغ قبل ما تشترون شيء مع بعض",
    steps: [
      "أنشئ عملية دفع تشاركي وحدد الهدف والمشاركين",
      "شارك الرابط العام مع الكل",
      "كل واحد يساهم بحصته أو بأي مبلغ يريده (حسب الإعداد)",
      "تابعوا التقدّم مباشرة حتى تصل 100%",
      "إذا اكتمل الهدف، العملية جاهزة للتحويل للمستفيد",
    ],
  },
  {
    title: "التسوية الذكية",
    subtitle: "لتصفير حساب المجموعة بأقل عدد تحويلات",
    steps: [
      "افتح تبويب «تسوية» داخل أي مجموعة",
      "قِطّة تحسب أفضل خطة تحويلات تلقائيًا",
      "أرسل مطالبة إلكترونية أو سجّل تحويل تم خارج التطبيق",
      "تابع حتى تظهر «تمت التسوية بالكامل ✓»",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 space-y-14">
      <div className="text-center">
        <h1 className="text-4xl font-black">كيف تعمل قِطّة؟</h1>
        <p className="mt-3 text-muted-foreground">ثلاث طرق بسيطة تدير فيها فلوسك مع أصحابك</p>
      </div>

      {flows.map((flow) => (
        <Card key={flow.title} className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold">{flow.title}</h2>
          <p className="mt-1 text-muted-foreground">{flow.subtitle}</p>
          <ol className="mt-5 space-y-3">
            {flow.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-800">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      ))}

      <div className="text-center">
        <Button asChild size="lg">
          <Link href="/signup">جرّب قِطّة الآن</Link>
        </Button>
      </div>
    </div>
  );
}
