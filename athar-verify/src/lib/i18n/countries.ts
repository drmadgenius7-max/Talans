/**
 * Distribution countries.
 *
 * Kept as a small, explicit list rather than a full ISO table: these are the
 * countries Athar actually distributes in, and the admin form should offer
 * exactly those. Adding one is a one-line change.
 */

export type Country = {
  code: string;
  nameAr: string;
  flag: string;
};

export const COUNTRIES: Country[] = [
  { code: 'TD', nameAr: 'تشاد', flag: '🇹🇩' },
  { code: 'NE', nameAr: 'النيجر', flag: '🇳🇪' },
  { code: 'ML', nameAr: 'مالي', flag: '🇲🇱' },
  { code: 'BF', nameAr: 'بوركينا فاسو', flag: '🇧🇫' },
  { code: 'SN', nameAr: 'السنغال', flag: '🇸🇳' },
  { code: 'NG', nameAr: 'نيجيريا', flag: '🇳🇬' },
  { code: 'GH', nameAr: 'غانا', flag: '🇬🇭' },
  { code: 'CI', nameAr: 'ساحل العاج', flag: '🇨🇮' },
  { code: 'GN', nameAr: 'غينيا', flag: '🇬🇳' },
  { code: 'MR', nameAr: 'موريتانيا', flag: '🇲🇷' },
  { code: 'SD', nameAr: 'السودان', flag: '🇸🇩' },
  { code: 'SO', nameAr: 'الصومال', flag: '🇸🇴' },
  { code: 'ET', nameAr: 'إثيوبيا', flag: '🇪🇹' },
  { code: 'KE', nameAr: 'كينيا', flag: '🇰🇪' },
  { code: 'TZ', nameAr: 'تنزانيا', flag: '🇹🇿' },
  { code: 'UG', nameAr: 'أوغندا', flag: '🇺🇬' },
  { code: 'MW', nameAr: 'مالاوي', flag: '🇲🇼' },
  { code: 'MZ', nameAr: 'موزمبيق', flag: '🇲🇿' },
  { code: 'YE', nameAr: 'اليمن', flag: '🇾🇪' },
  { code: 'SY', nameAr: 'سوريا', flag: '🇸🇾' },
  { code: 'PS', nameAr: 'فلسطين', flag: '🇵🇸' },
  { code: 'BD', nameAr: 'بنغلاديش', flag: '🇧🇩' },
  { code: 'PK', nameAr: 'باكستان', flag: '🇵🇰' },
  { code: 'IN', nameAr: 'الهند', flag: '🇮🇳' },
  { code: 'ID', nameAr: 'إندونيسيا', flag: '🇮🇩' },
  { code: 'PH', nameAr: 'الفلبين', flag: '🇵🇭' },
  { code: 'LK', nameAr: 'سريلانكا', flag: '🇱🇰' },
  { code: 'NP', nameAr: 'نيبال', flag: '🇳🇵' },
  { code: 'AF', nameAr: 'أفغانستان', flag: '🇦🇫' },
  { code: 'SA', nameAr: 'السعودية', flag: '🇸🇦' },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string): Country | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function countryLabel(code: string, fallbackNameAr?: string | null): string {
  const country = findCountry(code);
  if (country) return `${country.nameAr} ${country.flag}`;
  return fallbackNameAr ?? code;
}

export const SERVICE_TYPES = [
  'توزيع مصاحف',
  'توزيع كتب',
  'توزيع مصاحف وكتب',
  'وقف مصاحف',
  'إفطار صائم',
  'أخرى',
] as const;

export const ORDER_STATUS_AR: Record<string, string> = {
  PENDING: 'قيد التنفيذ',
  EXECUTED: 'تم التنفيذ',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
};

export const PROCESSING_STATUS_AR: Record<string, string> = {
  PENDING: 'بانتظار المعالجة',
  PROCESSING: 'جارٍ المعالجة',
  READY: 'جاهز',
  FAILED: 'فشلت المعالجة',
};

export const CHECK_SOURCE_AR: Record<string, string> = {
  CUSTOMER_UPLOAD: 'رفع من العميل',
  ADMIN_UPLOAD: 'رفع من الإدارة',
  LOOKUP: 'استعلام',
};

export const AI_RISK_AR: Record<string, string> = {
  NO_STRONG_SIGNALS: 'لا توجد مؤشرات قوية',
  SOME_SIGNALS: 'مؤشرات تستحق المراجعة',
  INCONCLUSIVE: 'غير حاسم',
};

export const ROLE_AR: Record<string, string> = {
  OWNER: 'مالك',
  ADMIN: 'مدير',
  OPERATOR: 'مُشغّل',
  VIEWER: 'مطّلع',
};
