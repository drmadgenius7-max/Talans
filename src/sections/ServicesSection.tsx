import { ArrowUpLeft } from 'lucide-react';
import FadeIn from '../components/FadeIn';
import SectionLabel from '../components/SectionLabel';
import { SERVICES } from '../data/services';

/**
 * مجالات العمل — القسم الفاتح الوحيد في الموقع،
 * يعمل كفاصل بصري بين الاستثمار والمشاريع.
 */
export function ServicesSection() {
  return (
    <section
      id="services"
      className="relative z-10 rounded-t-[40px] bg-white py-24 text-ink sm:rounded-t-[50px] sm:py-32 md:rounded-t-[60px] lg:py-40"
    >
      <div className="shell">
        <FadeIn>
          <SectionLabel index="04" label="مجالات عملنا" tone="dark" />
        </FadeIn>

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <FadeIn delay={0.1} className="lg:col-span-7">
            <h2
              className="font-black leading-[1.02] tracking-tight text-ink"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)' }}
            >
              ماذا نقدّم؟
            </h2>
          </FadeIn>

          <FadeIn delay={0.2} className="lg:col-span-5">
            <p className="text-sm leading-[1.9] text-ink/60 sm:text-base">
              نعمل عبر ستة مسارات متكاملة تغطي دورة حياة المشروع كاملة: من الفكرة
              وتطوير نموذج العمل، إلى الاستثمار والتأسيس، وصولًا إلى الشراكة
              والتوسع.
            </p>
          </FadeIn>
        </div>

        {/* قائمة الخدمات */}
        <div className="mt-16 sm:mt-24">
          {SERVICES.map((service, index) => (
            <FadeIn key={service.number} delay={0.06 * index} y={28}>
              <article className="group relative border-b border-ink/10 py-8 transition-colors duration-500 ease-premium hover:border-ink/40 sm:py-10">
                {/* خلفية متدرجة عند التحويم */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[-1.25rem] inset-y-0 -z-10 origin-right scale-x-0 rounded-2xl bg-ink/[0.03] transition-transform duration-500 ease-premium group-hover:scale-x-100"
                />

                <div className="flex items-start gap-5 sm:items-center sm:gap-10">
                  <span
                    className="font-latin shrink-0 font-black leading-none text-ink/15 transition-colors duration-500 ease-premium group-hover:text-ink/35"
                    style={{ fontSize: 'clamp(2rem, 4.5vw, 3.75rem)' }}
                  >
                    {service.number}
                  </span>

                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
                    <h3
                      className="font-bold leading-tight tracking-tight text-ink transition-transform duration-500 ease-premium group-hover:-translate-x-1.5"
                      style={{ fontSize: 'clamp(1.375rem, 3.2vw, 2.75rem)' }}
                    >
                      {service.title}
                    </h3>

                    <p className="max-w-md text-sm leading-relaxed text-ink/55 sm:text-base">
                      {service.description}
                    </p>
                  </div>

                  <ArrowUpLeft
                    size={26}
                    aria-hidden="true"
                    className="mt-1 hidden shrink-0 text-ink/20 transition-all duration-500 ease-premium group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:text-ink sm:mt-0 sm:block"
                  />
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
