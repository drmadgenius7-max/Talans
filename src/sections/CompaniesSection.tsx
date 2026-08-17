import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CompanyCard from '../components/CompanyCard';
import FadeIn, { PREMIUM_EASE } from '../components/FadeIn';
import SectionLabel from '../components/SectionLabel';
import { COMPANIES } from '../data/companies';

const ALL = 'الكل';

export function CompaniesSection() {
  const sectors = useMemo(
    () => [ALL, ...Array.from(new Set(COMPANIES.map((company) => company.sector)))],
    [],
  );

  const [active, setActive] = useState(ALL);

  const visible = useMemo(
    () =>
      active === ALL
        ? COMPANIES
        : COMPANIES.filter((company) => company.sector === active),
    [active],
  );

  return (
    <section
      id="companies"
      className="relative bg-ink py-24 sm:py-32 lg:py-40"
    >
      <div className="shell">
        <FadeIn>
          <SectionLabel index="02" label="شركاتنا" />
        </FadeIn>

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <FadeIn delay={0.1} className="lg:col-span-7">
            <h2
              className="text-gradient-mist font-black leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(2.25rem, 6vw, 5.5rem)' }}
            >
              شركاتنا وعلاماتنا التجارية
            </h2>
          </FadeIn>

          <FadeIn delay={0.2} className="lg:col-span-5">
            <p className="text-sm leading-[1.9] text-mist/55 sm:text-base">
              تضم المجموعة تحت مظلتها عددًا من الشركات والعلامات التجارية والمشاريع
              التي تعمل في قطاعات متعددة، ويجمعها نموذج تشغيلي واحد ورؤية مشتركة
              للنمو والتوسع.
            </p>
          </FadeIn>
        </div>

        {/* مرشّح القطاعات */}
        <FadeIn delay={0.25}>
          <div
            className="mt-12 flex flex-wrap gap-2 sm:mt-16 sm:gap-3"
            role="group"
            aria-label="تصفية الشركات حسب القطاع"
          >
            {sectors.map((sector) => {
              const isActive = sector === active;
              return (
                <button
                  key={sector}
                  type="button"
                  onClick={() => setActive(sector)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-4 py-2 text-xs transition-colors duration-300 ease-premium sm:px-5 sm:py-2.5 sm:text-sm ${
                    isActive
                      ? 'border-mist bg-mist text-ink'
                      : 'border-white/10 text-mist/60 hover:border-mist/40 hover:text-mist'
                  }`}
                >
                  {sector}
                </button>
              );
            })}
          </div>
        </FadeIn>

        {/* الشبكة */}
        <motion.div
          layout
          className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {visible.map((company, index) => (
              <motion.div
                key={company.id}
                layout
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(index * 0.05, 0.3),
                  ease: PREMIUM_EASE,
                }}
              >
                <CompanyCard company={company} index={index} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <FadeIn delay={0.15}>
          <p className="mt-10 text-xs text-mist/35 sm:text-sm">
            * تُعرض هنا نماذج من شركات ومشاريع المجموعة، ويتم تحديث القائمة بشكل
            دوري.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

export default CompaniesSection;
