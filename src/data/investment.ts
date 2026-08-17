import type { LucideIcon } from 'lucide-react';
import { Briefcase, Cpu, Rocket } from 'lucide-react';

/** محاور الاستثمار الثلاثة */
export interface InvestmentPillar {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** كلمات مفتاحية تظهر أسفل البطاقة */
  tags: string[];
}

export const INVESTMENT_PILLARS: InvestmentPillar[] = [
  {
    id: 'commercial',
    title: 'مشاريع تجارية',
    description:
      'مشاريع لديها نموذج أعمال واضح وفرصة للنمو والتوسع.',
    icon: Briefcase,
    tags: ['نموذج أعمال', 'تشغيل', 'توسع'],
  },
  {
    id: 'tech',
    title: 'مشاريع تقنية',
    description:
      'منتجات وحلول تقنية قادرة على معالجة احتياج حقيقي وبناء قيمة طويلة المدى.',
    icon: Cpu,
    tags: ['منتج رقمي', 'حلول', 'قيمة مستدامة'],
  },
  {
    id: 'entrepreneurial',
    title: 'مشاريع ريادية',
    description:
      'رواد أعمال لديهم رؤية واضحة وفريق قادر على التنفيذ.',
    icon: Rocket,
    tags: ['رؤية', 'فريق', 'تنفيذ'],
  },
];

/** رحلة الاستثمار */
export interface InvestmentStep {
  number: string;
  title: string;
  description: string;
}

export const INVESTMENT_PROCESS: InvestmentStep[] = [
  {
    number: '01',
    title: 'الفكرة',
    description: 'نستمع للفكرة ونفهم المشكلة التي تعالجها والقيمة التي تقدّمها.',
  },
  {
    number: '02',
    title: 'دراسة الفرصة',
    description: 'نحلّل السوق والنموذج التشغيلي وحجم الفرصة الحقيقية للنمو.',
  },
  {
    number: '03',
    title: 'التقييم',
    description: 'نقيّم الجدوى والمخاطر ومتطلبات التنفيذ ومؤشرات الأداء.',
  },
  {
    number: '04',
    title: 'الشراكة',
    description: 'نتفق على إطار واضح للشراكة والأدوار والالتزامات المتبادلة.',
  },
  {
    number: '05',
    title: 'النمو',
    description: 'ندعم التشغيل والتطوير ونعمل على تسريع مسار النمو.',
  },
  {
    number: '06',
    title: 'التوسع',
    description: 'نوسّع النطاق ونفتح قنوات وأسواقًا جديدة للمشروع.',
  },
];
