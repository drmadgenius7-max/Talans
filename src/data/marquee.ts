import { abstractVisual } from './visuals';

/**
 * العناصر البصرية لشريط «شبكة الأعمال» بين الـ Hero وباقي المحتوى.
 * استبدل `image` بمسار صورة حقيقية عند توفرها، دون تعديل أي Component.
 */

export interface MarqueeItem {
  id: string;
  label: string;
  image: string;
}

export const MARQUEE_ROW_ONE: MarqueeItem[] = [
  { id: 'tech', label: 'التقنية', image: abstractVisual({ seed: 1, variant: 'network' }) },
  { id: 'trade', label: 'التجارة', image: abstractVisual({ seed: 2, variant: 'blocks' }) },
  { id: 'realestate', label: 'العقار', image: abstractVisual({ seed: 3, variant: 'grid' }) },
  { id: 'products', label: 'المنتجات', image: abstractVisual({ seed: 4, variant: 'arc' }) },
  { id: 'software', label: 'البرمجيات', image: abstractVisual({ seed: 5, variant: 'orbit' }) },
];

export const MARQUEE_ROW_TWO: MarqueeItem[] = [
  { id: 'investment', label: 'الاستثمار', image: abstractVisual({ seed: 6, variant: 'waves' }) },
  { id: 'companies', label: 'الشركات', image: abstractVisual({ seed: 7, variant: 'blocks' }) },
  {
    id: 'entrepreneurship',
    label: 'ريادة الأعمال',
    image: abstractVisual({ seed: 8, variant: 'orbit' }),
  },
  { id: 'projects', label: 'المشاريع', image: abstractVisual({ seed: 9, variant: 'network' }) },
  { id: 'growth', label: 'النمو', image: abstractVisual({ seed: 10, variant: 'arc' }) },
];
