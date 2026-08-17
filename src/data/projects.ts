import { abstractVisual } from './visuals';

/**
 * مشاريع المجموعة المعروضة في قسم «مشاريعنا».
 * البيانات نماذج أولية قابلة للتعديل بالكامل.
 */

export interface Project {
  id: string;
  /** رقم العرض — يظهر ضخمًا داخل البطاقة */
  index: string;
  /** التصنيف الظاهر أعلى البطاقة */
  category: string;
  name: string;
  description: string;
  /** نقاط مختصرة تصف المشروع */
  highlights: string[];
  /** صور البطاقة (3 صور تعطي أفضل تناسق) */
  images: string[];
  /** رابط المشروع — اتركه فارغًا ليصبح الزر غير فعّال */
  url?: string;
}

export const PROJECTS: Project[] = [
  {
    id: 'talans-business-venture',
    index: '01',
    category: 'مشروع تجاري — تطوير واستثمار',
    name: 'Talans Business Venture',
    description:
      'مشروع تجاري تم تطويره بهدف بناء نموذج أعمال قابل للتوسع والنمو في السوق السعودي.',
    highlights: ['نموذج أعمال قابل للتوسع', 'تشغيل تجاري متكامل', 'نمو مدروس'],
    images: [
      abstractVisual({ seed: 101, variant: 'blocks', width: 640, height: 640 }),
      abstractVisual({ seed: 102, variant: 'grid', width: 640, height: 640 }),
      abstractVisual({ seed: 103, variant: 'arc', width: 640, height: 640 }),
    ],
  },
  {
    id: 'talans-digital',
    index: '02',
    category: 'مشروع تقني',
    name: 'Talans Digital',
    description:
      'مشروع رقمي يركّز على بناء حلول تقنية ومنتجات رقمية ذات قيمة حقيقية للمستخدمين والشركات.',
    highlights: ['منتجات رقمية', 'حلول تقنية', 'قيمة طويلة المدى'],
    images: [
      abstractVisual({ seed: 201, variant: 'network', width: 640, height: 640 }),
      abstractVisual({ seed: 202, variant: 'orbit', width: 640, height: 640 }),
      abstractVisual({ seed: 203, variant: 'waves', width: 640, height: 640 }),
    ],
  },
  {
    id: 'talans-ventures',
    index: '03',
    category: 'مشروع ريادي',
    name: 'Talans Ventures',
    description:
      'مبادرة لدعم الأفكار والمشاريع الريادية الواعدة وتحويلها إلى فرص قابلة للنمو والاستثمار.',
    highlights: ['دعم رواد الأعمال', 'من الفكرة إلى الفرصة', 'شراكة واستثمار'],
    images: [
      abstractVisual({ seed: 301, variant: 'orbit', width: 640, height: 640 }),
      abstractVisual({ seed: 302, variant: 'network', width: 640, height: 640 }),
      abstractVisual({ seed: 303, variant: 'blocks', width: 640, height: 640 }),
    ],
  },
];
