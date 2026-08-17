import type { FormDefinition } from '../data/forms';
import { whatsappLink } from '../data/site';

export type FormValues = Record<string, string>;

/**
 * إرسال بيانات النموذج.
 *
 * 🔌 نقطة الربط بالخادم:
 * لا يوجد Backend في هذا المشروع حاليًا، لذلك تُحاكى العملية محليًا.
 * لربط النموذج بخدمة حقيقية (API / Formspree / Google Sheets ...):
 * استبدل محتوى هذه الدالة بطلب `fetch` إلى نقطة النهاية لديك.
 *
 * ```ts
 * const response = await fetch(ENDPOINT, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ form: form.id, ...values }),
 * });
 * if (!response.ok) throw new Error('تعذّر إرسال الطلب');
 * ```
 */
export async function submitForm(
  form: FormDefinition,
  values: FormValues,
): Promise<void> {
  // محاكاة زمن الاستجابة حتى تظهر حالة التحميل بشكل طبيعي
  await new Promise((resolve) => setTimeout(resolve, 900));

  if (import.meta.env.DEV) {
    // يساعد على التحقق من البيانات أثناء التطوير
    console.info('[TALANS] نموذج مُرسَل:', form.id, values);
  }
}

/** يبني رسالة واتساب مرتّبة من بيانات النموذج */
export function buildWhatsappMessage(
  form: FormDefinition,
  values: FormValues,
): string {
  const lines = form.fields
    .filter((field) => values[field.name]?.trim())
    .map((field) => `• ${field.label}: ${values[field.name].trim()}`);

  return [
    'السلام عليكم، أرغب في التواصل مع مجموعة تالانس.',
    `النموذج: ${form.title}`,
    '',
    ...lines,
  ].join('\n');
}

/** رابط واتساب جاهز يحتوي على بيانات النموذج */
export function whatsappFormLink(
  form: FormDefinition,
  values: FormValues,
): string {
  return whatsappLink(buildWhatsappMessage(form, values));
}
