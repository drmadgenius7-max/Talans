import { BRAND } from '../data/site';

interface LogoProps {
  /** حجم رمز الشعار بالبكسل */
  size?: number;
  /** إظهار اسم المجموعة بجانب الرمز */
  withWordmark?: boolean;
  className?: string;
}

/**
 * شعار المجموعة.
 * مصدر الملف واحد فقط: `BRAND.markSrc` في `src/data/site.ts`
 * — استبدال ملف الشعار يسري تلقائيًا على كل الموقع.
 */
export function Logo({ size = 40, withWordmark = true, className = '' }: LogoProps) {
  const showText = withWordmark && BRAND.showWordmark;

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={BRAND.markSrc}
        alt={BRAND.markAlt}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 object-contain"
      />

      {showText && (
        <span className="flex flex-col leading-none">
          <span className="text-[0.95rem] font-semibold tracking-tight text-white sm:text-base">
            {BRAND.nameAr}
          </span>
          <span className="font-latin text-[0.6rem] font-medium uppercase tracking-[0.28em] text-mist/55 sm:text-[0.65rem]">
            {BRAND.nameEn}
          </span>
        </span>
      )}
    </span>
  );
}

export default Logo;
