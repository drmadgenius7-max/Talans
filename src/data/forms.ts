/**
 * تعريف حقول نماذج «فرص التعاون».
 * تعديل الحقول أو ترتيبها أو إضافتها يتم من هنا فقط.
 */

export type FieldType = 'text' | 'tel' | 'email' | 'textarea' | 'select' | 'url';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  /** خيارات القوائم المنسدلة */
  options?: string[];
  /** الحقل يأخذ عرض العمودين في الشبكة */
  full?: boolean;
}

export interface FormDefinition {
  id: 'idea' | 'investment';
  title: string;
  intro: string;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  fields: FormField[];
}

const STAGES = [
  'فكرة أولية',
  'نموذج أولي',
  'تم الإطلاق',
  'مشروع قائم',
  'مرحلة نمو / توسع',
];

const SECTORS = [
  'التجارة',
  'التجارة الإلكترونية',
  'التقنية',
  'الحلول الرقمية',
  'المنتجات',
  'الخدمات',
  'التسويق',
  'العقار',
  'أخرى',
];

const INVESTMENT_SIZES = [
  'أقل من 100 ألف ريال',
  '100 – 500 ألف ريال',
  '500 ألف – مليون ريال',
  'أكثر من مليون ريال',
  'غير محدد بعد',
];

export const IDEA_FORM: FormDefinition = {
  id: 'idea',
  title: 'شاركنا فكرتك التجارية',
  intro:
    'عبّئ المعلومات التالية، وسيقوم فريق المجموعة بمراجعتها والتواصل معك.',
  submitLabel: 'إرسال الطلب',
  successTitle: 'تم استلام طلبك بنجاح',
  successMessage:
    'تم استلام طلبك بنجاح، وفريق مجموعة تالانس سيقوم بمراجعة المعلومات والتواصل معك.',
  fields: [
    { name: 'name', label: 'الاسم', type: 'text', required: true, placeholder: 'الاسم الكامل' },
    { name: 'phone', label: 'رقم الجوال', type: 'tel', required: true, placeholder: '05XXXXXXXX' },
    {
      name: 'email',
      label: 'البريد الإلكتروني',
      type: 'email',
      required: true,
      placeholder: 'name@example.com',
    },
    {
      name: 'projectName',
      label: 'اسم المشروع أو الفكرة',
      type: 'text',
      required: true,
      placeholder: 'اسم الفكرة',
    },
    { name: 'sector', label: 'المجال', type: 'select', required: true, options: SECTORS },
    { name: 'stage', label: 'المرحلة الحالية', type: 'select', required: true, options: STAGES },
    {
      name: 'description',
      label: 'وصف الفكرة',
      type: 'textarea',
      required: true,
      full: true,
      placeholder: 'اشرح فكرتك باختصار: المشكلة التي تعالجها، والقيمة التي تقدّمها.',
    },
    {
      name: 'investmentSize',
      label: 'حجم الاستثمار المطلوب (اختياري)',
      type: 'select',
      options: INVESTMENT_SIZES,
    },
    {
      name: 'link',
      label: 'رابط المشروع (اختياري)',
      type: 'url',
      placeholder: 'https://',
    },
  ],
};

export const INVESTMENT_FORM: FormDefinition = {
  id: 'investment',
  title: 'قدّم فرصتك الاستثمارية',
  intro:
    'شاركنا تفاصيل المشروع، وسنقوم بدراسة الفرصة والرد عليك في أقرب وقت.',
  submitLabel: 'إرسال الفرصة الاستثمارية',
  successTitle: 'تم استلام فرصتك بنجاح',
  successMessage:
    'تم استلام طلبك بنجاح، وفريق مجموعة تالانس سيقوم بمراجعة المعلومات والتواصل معك.',
  fields: [
    {
      name: 'ownerName',
      label: 'اسم صاحب المشروع',
      type: 'text',
      required: true,
      placeholder: 'الاسم الكامل',
    },
    { name: 'phone', label: 'رقم الجوال', type: 'tel', required: true, placeholder: '05XXXXXXXX' },
    {
      name: 'email',
      label: 'البريد الإلكتروني',
      type: 'email',
      required: true,
      placeholder: 'name@example.com',
    },
    {
      name: 'companyName',
      label: 'اسم الشركة / المشروع',
      type: 'text',
      required: true,
      placeholder: 'الاسم التجاري',
    },
    { name: 'sector', label: 'القطاع', type: 'select', required: true, options: SECTORS },
    { name: 'stage', label: 'مرحلة المشروع', type: 'select', required: true, options: STAGES },
    {
      name: 'summary',
      label: 'نبذة عن المشروع',
      type: 'textarea',
      required: true,
      full: true,
      placeholder: 'نموذج العمل، السوق المستهدف، الوضع الحالي للمشروع.',
    },
    {
      name: 'investmentSize',
      label: 'حجم الاستثمار المطلوب',
      type: 'select',
      required: true,
      options: INVESTMENT_SIZES,
    },
    {
      name: 'equity',
      label: 'نسبة الشراكة المقترحة (اختياري)',
      type: 'text',
      placeholder: 'مثال: 20%',
    },
    {
      name: 'link',
      label: 'رابط المشروع أو الموقع (اختياري)',
      type: 'url',
      placeholder: 'https://',
    },
  ],
};
