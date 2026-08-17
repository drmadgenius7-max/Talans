import { abstractVisual } from './visuals';

/**
 * شركات وعلامات المجموعة.
 *
 * ⚠️ الأسماء أدناه أسماء مؤقتة (Placeholder) — تُستبدل بالأسماء الرسمية.
 * لإضافة شركة: أضف عنصرًا جديدًا إلى المصفوفة فقط.
 */

export type CompanyStatus = 'قائمة' | 'قيد التطوير' | 'استثمار' | 'شراكة';

export interface Company {
  id: string;
  /** الاسم كما يُعرض */
  name: string;
  /** الاسم اللاتيني — اختياري */
  nameEn?: string;
  /** المجال / القطاع */
  sector: string;
  description: string;
  status: CompanyStatus;
  /** مسار الصورة — استبدله بمسار صورة حقيقية عند توفرها */
  image: string;
  /** رابط موقع الشركة — اتركه فارغًا لإخفاء الزر */
  url?: string;
}

export const COMPANIES: Company[] = [
  {
    id: 'company-one',
    name: 'Company One',
    nameEn: 'Company One',
    sector: 'التجارة',
    description:
      'نشاط تجاري متكامل يعمل على تطوير وتشغيل خطوط منتجات موجّهة للسوق المحلي بنموذج قابل للتوسع.',
    status: 'قائمة',
    image: abstractVisual({ seed: 11, variant: 'blocks' }),
  },
  {
    id: 'company-two',
    name: 'Company Two',
    nameEn: 'Company Two',
    sector: 'التقنية',
    description:
      'منصة تقنية تركّز على بناء حلول رقمية تخدم احتياجات الشركات وتُحسّن كفاءة عملياتها اليومية.',
    status: 'قائمة',
    image: abstractVisual({ seed: 22, variant: 'network' }),
  },
  {
    id: 'company-three',
    name: 'Company Three',
    nameEn: 'Company Three',
    sector: 'التجارة الإلكترونية',
    description:
      'علامة تجارية رقمية تعمل عبر قنوات البيع الإلكترونية مع تركيز واضح على تجربة العميل وجودة المنتج.',
    status: 'قائمة',
    image: abstractVisual({ seed: 33, variant: 'grid' }),
  },
  {
    id: 'company-four',
    name: 'Company Four',
    nameEn: 'Company Four',
    sector: 'الخدمات',
    description:
      'ذراع خدمي يقدّم حلولًا تشغيلية وإدارية تدعم نمو المشاريع في مراحلها المختلفة.',
    status: 'قائمة',
    image: abstractVisual({ seed: 44, variant: 'arc' }),
  },
  {
    id: 'company-five',
    name: 'Company Five',
    nameEn: 'Company Five',
    sector: 'التسويق',
    description:
      'وحدة متخصصة في بناء العلامات التجارية وإدارة الحضور التسويقي للمشاريع التابعة والشريكة.',
    status: 'قيد التطوير',
    image: abstractVisual({ seed: 55, variant: 'waves' }),
  },
  {
    id: 'company-six',
    name: 'Company Six',
    nameEn: 'Company Six',
    sector: 'الحلول الرقمية',
    description:
      'مشروع رقمي يعمل على تطوير منتجات برمجية تعالج احتياجًا واضحًا وتبني قيمة طويلة المدى.',
    status: 'قيد التطوير',
    image: abstractVisual({ seed: 66, variant: 'orbit' }),
  },
  {
    id: 'company-seven',
    name: 'Company Seven',
    nameEn: 'Company Seven',
    sector: 'العقار',
    description:
      'استثمارات وتطوير في القطاع العقاري ضمن فرص مدروسة تحقق عائدًا مستقرًا على المدى الطويل.',
    status: 'استثمار',
    image: abstractVisual({ seed: 77, variant: 'blocks' }),
  },
  {
    id: 'company-eight',
    name: 'Company Eight',
    nameEn: 'Company Eight',
    sector: 'المنتجات',
    description:
      'تطوير وتشغيل خطوط منتجات بعلامة خاصة، من التصميم وحتى الوصول إلى العميل النهائي.',
    status: 'شراكة',
    image: abstractVisual({ seed: 88, variant: 'network' }),
  },
];
