import Link from "next/link";
import { redirect } from "next/navigation";
import { HandCoins, Sparkles, Receipt, Scale, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";

const pillars = [
  {
    icon: Receipt,
    title: "إدارة المصاريف المشتركة",
    description: "سجّلوا مصاريفكم وقسّموها بالتساوي أو بأي طريقة تناسبكم — بالتفصيل لو احتجتم.",
  },
  {
    icon: HandCoins,
    title: "المطالبات المالية",
    description: "دفعت عن أصحابك؟ طالبهم برابط دفع واضح وسهل، حتى لو ما عندهم حساب.",
  },
  {
    icon: Scale,
    title: "التسوية الذكية",
    description: "قِطّة تحسب أقل عدد تحويلات ممكن عشان توصلكم لتصفير الحساب بسرعة.",
  },
  {
    icon: Sparkles,
    title: "الدفع التشاركي",
    description: "تبغون تشترون شيء مع بعض؟ اجمعوا المبلغ أولًا بالدفع التشاركي.",
  },
];

const steps = [
  { title: "دفعت عن أصحابك؟", body: "قسّم المبلغ وطالبهم بسهولة." },
  { title: "تبغون تشترون شيء مع بعض؟", body: "اجمعوا المبلغ أولًا بالدفع التشاركي." },
  { title: "ودّعوا حسبة: مين له ومين عليه", body: "قِطّة تسوي الحساب عنكم." },
];

export default async function MarketingHomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-background to-background px-4 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mx-auto w-fit rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-800">
            🐱 منصة سعودية لإدارة الأموال المشتركة
          </div>
          <h1 className="text-balance text-5xl font-black tracking-tight sm:text-6xl">الحسبة علينا.</h1>
          <p className="text-balance text-lg text-muted-foreground sm:text-xl">
            قسّم الفواتير، طالب أصحابك، واجمعوا قيمة مشترياتكم مع بعض — كل شيء في قِطّة.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">ابدأ مجانًا</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/how-it-works">كيف تعمل قِطّة؟</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">أربع طرق تدير فيها فلوسكم مع بعض</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <Card key={p.title} className="p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <p.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-bold">{p.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-bold">بثلاث خطوات بسيطة</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Card key={s.title} className="p-6">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="font-bold">{s.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-3xl font-bold">جاهز تبدأ قِطّتك؟</h2>
        <p className="mt-2 text-muted-foreground">مجاني تمامًا، وما يأخذ منك دقيقة.</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/signup">
            ابدأ الآن <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {["بدون رسوم خفية", "عربي بالكامل", "دعم متعدد العملات"].map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> {f}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
