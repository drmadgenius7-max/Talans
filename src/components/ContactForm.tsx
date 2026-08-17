import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import type { FormDefinition, FormField } from '../data/forms';
import { PREMIUM_EASE } from './FadeIn';
import { submitForm, whatsappFormLink } from '../lib/submitForm';
import type { FormValues } from '../lib/submitForm';

interface ContactFormProps {
  /** النموذج المعروض — `null` يعني أن النافذة مغلقة */
  form: FormDefinition | null;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{9,}$/;

const FIELD_CLASS = [
  'w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-mist',
  'placeholder:text-mist/25 transition-colors duration-200 ease-premium',
  'focus:border-mist/40 focus:bg-white/[0.05] focus:outline-none',
].join(' ');

function validate(fields: FormField[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    const value = (values[field.name] ?? '').trim();

    if (field.required && !value) {
      errors[field.name] = 'هذا الحقل مطلوب';
      return;
    }
    if (!value) return;

    if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
      errors[field.name] = 'يرجى إدخال بريد إلكتروني صحيح';
    }
    if (field.type === 'tel' && !PHONE_PATTERN.test(value)) {
      errors[field.name] = 'يرجى إدخال رقم جوال صحيح';
    }
    if (field.type === 'url' && !/^https?:\/\/.+/i.test(value)) {
      errors[field.name] = 'يرجى إدخال رابط يبدأ بـ https://';
    }
  });

  return errors;
}

/** نموذج تفاعلي داخل نافذة منبثقة (Modal / Sheet) */
export function ContactForm({ form, onClose }: ContactFormProps) {
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const open = form !== null;

  // إعادة ضبط الحالة عند فتح نموذج جديد
  useEffect(() => {
    if (!open) return;
    setValues({});
    setErrors({});
    setStatus('idle');
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 350);
    return () => window.clearTimeout(timer);
  }, [open, form?.id]);

  // قفل التمرير خلف النافذة
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // الإغلاق بمفتاح Escape + حصر التنقل بلوحة المفاتيح داخل النافذة
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const setValue = useCallback((name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!form) return;

      const found = validate(form.fields, values);
      setErrors(found);

      if (Object.keys(found).length > 0) {
        const firstError = form.fields.find((field) => found[field.name]);
        if (firstError) {
          panelRef.current
            ?.querySelector<HTMLElement>(`[name="${firstError.name}"]`)
            ?.focus();
        }
        return;
      }

      setStatus('sending');
      try {
        await submitForm(form, values);
        setStatus('done');
      } catch {
        setStatus('idle');
        setErrors({ __form: 'تعذّر إرسال الطلب، يرجى المحاولة مرة أخرى.' });
      }
    },
    [form, values],
  );

  const whatsappHref = useMemo(
    () => (form ? whatsappFormLink(form, values) : '#'),
    [form, values],
  );

  return (
    <AnimatePresence>
      {open && form && (
        <motion.div
          key="form-overlay"
          className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: PREMIUM_EASE }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-form-title"
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: PREMIUM_EASE }}
            className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] border border-white/10 bg-ink-soft p-6 sm:max-w-3xl sm:rounded-[36px] sm:p-9"
            style={{ willChange: 'transform' }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق النموذج"
              className="absolute end-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-mist/70 transition-colors duration-200 ease-premium hover:border-mist/50 hover:text-mist sm:end-7 sm:top-7"
            >
              <X size={18} />
            </button>

            {status === 'done' ? (
              <div className="flex flex-col items-center py-10 text-center sm:py-16">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: PREMIUM_EASE }}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 text-accent"
                >
                  <Check size={28} />
                </motion.span>

                <h3 className="mt-6 text-2xl font-bold text-white sm:text-3xl">
                  {form.successTitle}
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-mist/65 sm:text-base">
                  {form.successMessage}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-mist/25 px-6 py-3 text-sm font-medium text-mist transition-colors duration-300 ease-premium hover:border-mist hover:bg-mist hover:text-ink"
                  >
                    إرسال نسخة عبر واتساب
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-white/[0.06] px-6 py-3 text-sm font-medium text-mist transition-colors duration-300 ease-premium hover:bg-white/10"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <header className="pe-12">
                  <h3
                    id="contact-form-title"
                    className="text-2xl font-bold text-white sm:text-3xl"
                  >
                    {form.title}
                  </h3>
                  <p className="mt-2 text-sm text-mist/55">{form.intro}</p>
                </header>

                <div className="mt-7 grid gap-4 sm:grid-cols-2 sm:gap-5">
                  {form.fields.map((field, index) => {
                    const error = errors[field.name];
                    const id = `${form.id}-${field.name}`;
                    const describedBy = error ? `${id}-error` : undefined;

                    return (
                      <div
                        key={field.name}
                        className={field.full ? 'sm:col-span-2' : undefined}
                      >
                        <label
                          htmlFor={id}
                          className="mb-2 block text-xs font-medium text-mist/70"
                        >
                          {field.label}
                          {field.required && (
                            <span className="text-accent" aria-hidden="true">
                              {' '}
                              *
                            </span>
                          )}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            id={id}
                            name={field.name}
                            rows={4}
                            required={field.required}
                            placeholder={field.placeholder}
                            value={values[field.name] ?? ''}
                            onChange={(event) => setValue(field.name, event.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-describedby={describedBy}
                            className={`${FIELD_CLASS} resize-y ${
                              error ? 'border-red-500/60' : ''
                            }`}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            id={id}
                            name={field.name}
                            required={field.required}
                            value={values[field.name] ?? ''}
                            onChange={(event) => setValue(field.name, event.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-describedby={describedBy}
                            className={`${FIELD_CLASS} ${error ? 'border-red-500/60' : ''}`}
                          >
                            <option value="" className="bg-ink-soft">
                              اختر...
                            </option>
                            {field.options?.map((option) => (
                              <option key={option} value={option} className="bg-ink-soft">
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            ref={index === 0 ? firstFieldRef : undefined}
                            id={id}
                            name={field.name}
                            type={field.type === 'url' ? 'url' : field.type}
                            inputMode={field.type === 'tel' ? 'tel' : undefined}
                            dir={field.type === 'email' || field.type === 'url' ? 'ltr' : undefined}
                            required={field.required}
                            placeholder={field.placeholder}
                            value={values[field.name] ?? ''}
                            onChange={(event) => setValue(field.name, event.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-describedby={describedBy}
                            className={`${FIELD_CLASS} ${
                              field.type === 'email' || field.type === 'url'
                                ? 'text-start'
                                : ''
                            } ${error ? 'border-red-500/60' : ''}`}
                          />
                        )}

                        {error && (
                          <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-red-400">
                            {error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {errors.__form && (
                  <p role="alert" className="mt-5 text-sm text-red-400">
                    {errors.__form}
                  </p>
                )}

                <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                  <p className="text-xs text-mist/40">
                    الحقول المعلّمة بـ <span className="text-accent">*</span> مطلوبة
                  </p>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-full px-8 py-4 text-sm font-semibold text-white transition-transform duration-300 ease-premium hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    style={{
                      background:
                        'linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)',
                      boxShadow:
                        '0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset',
                    }}
                  >
                    {status === 'sending' && (
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    )}
                    {status === 'sending' ? 'جارٍ الإرسال...' : form.submitLabel}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ContactForm;
