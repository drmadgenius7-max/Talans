import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import {
  Receipt,
  HandCoins,
  Scale,
  Sparkles,
  Users2,
  Calculator,
  BellRing,
  Camera,
  QrCode,
  Globe,
  ShieldCheck,
  Repeat,
} from "lucide-react";

export const metadata: Metadata = { title: "المزايا" };

const sections = [
  {
    id: "paid-for-them",
    icon: HandCoins,
    title: "دفعت عنهم",
    description:
      "دفعت فاتورة كاملة نيابة عن مجموعة؟ قِطّة تحسب حصة كل شخص تلقائيًا وتنشئ مطالبات وروابط دفع جاهزة للمشاركة.",
  },
  {
    id: "shared-payment",
    icon: Sparkles,
    title: "الدفع التشاركي",
    description:
      "قبل ما تشترون شيء مع بعض — هدية، رحلة، أو أي مصروف مشترك — اجمعوا المبلغ أولًا. تابعوا التقدّم لحظة بلحظة حتى الوصول لـ 100%.",
  },
  {
    id: "split-bills",
    icon: Calculator,
    title: "تقسيم الفواتير",
    description: "خمس طرق تقسيم: بالتساوي، مبلغ محدد، نسبة، حصص، أو حسب العناصر — مع دعم كامل للضريبة والخصومات ورسوم التوصيل.",
  },
  {
    id: "groups",
    icon: Users2,
    title: "المجموعات",
    description: "رحلات، سكن، مناسبات، أو أي مجموعة تحتاجونها — بأدوار وصلاحيات واضحة، ودعم لإضافة أشخاص حتى بدون حساب.",
  },
  { icon: Scale, title: "التسوية الذكية", description: "خوارزمية تقلل عدد التحويلات المطلوبة لتصفير حساب المجموعة بالكامل." },
  { icon: Repeat, title: "المصروفات المتكررة", description: "إيجار، اشتراكات، فواتير — سجّلها مرة وخلها تتكرر أسبوعيًا أو شهريًا أو سنويًا." },
  { icon: Camera, title: "مرفقات الإيصالات", description: "ارفق صورة أو PDF لأي مصروف، مع بنية جاهزة لدعم قراءة الإيصالات بالذكاء الاصطناعي مستقبلًا." },
  { icon: BellRing, title: "التذكيرات", description: "تذكيرات تلقائية للمطالبات المتأخرة، بدون إزعاج أو تكرار مبالغ فيه." },
  { icon: QrCode, title: "مشاركة سريعة", description: "روابط دعوة ومطالبات مع رمز QR، جاهزة للمشاركة عبر واتساب أو أي وسيلة." },
  { icon: Globe, title: "عملات متعددة", description: "دعم للريال السعودي والدرهم والدولار وعدة عملات خليجية وعالمية أخرى." },
  { icon: ShieldCheck, title: "أمان أولًا", description: "روابط عامة بمعرّفات عشوائية آمنة، صلاحيات محكمة، وسجل تدقيق كامل لكل حركة مالية." },
  { icon: Receipt, title: "الإحصائيات", description: "تابع أنماط صرفك الشهرية، أكثر فئة، وأكثر مجموعة صرفًا — برسوم بيانية واضحة." },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black">مزايا قِطّة</h1>
        <p className="mt-3 text-muted-foreground">كل اللي تحتاجه لإدارة الفلوس المشتركة، في مكان واحد</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Card key={s.title} id={s.id} className="p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 font-bold">{s.title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
