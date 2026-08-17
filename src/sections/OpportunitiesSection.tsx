import { motion } from 'framer-motion';
import { Lightbulb, MessageCircle, TrendingUp } from 'lucide-react';
import FadeIn, { PREMIUM_EASE } from '../components/FadeIn';
import SectionLabel from '../components/SectionLabel';
import ContactButton from '../components/ContactButton';
import type { FormDefinition } from '../data/forms';
import { IDEA_FORM, INVESTMENT_FORM } from '../data/forms';
import { whatsappLink } from '../data/site';

interface OpportunitiesSectionProps {
  onOpenForm: (form: FormDefinition) => void;
}

const CARDS = [
  {
    id: 'idea',
    icon: Lightbulb,
    title: 'عندي فكرة تجارية',
    description:
      'إذا عندك فكرة تجارية وتشوف أنها تستحق أن تتحول إلى مشروع حقيقي، شاركنا فكرتك.',
    cta: 'أرسل فكرتك',
    form: IDEA_FORM,
  },
  {
    id: 'investment',
    icon: TrendingUp,
    title: 'عندي مشروع وأبحث عن استثمار',
    description:
      'إذا عندك مشروع قائم أو فرصة استثمارية وتبحث عن شريك استراتيجي، شاركنا تفاصيل المشروع.',
    cta: 'قدّم فرصتك الاستثمارية',
    form: INVESTMENT_FORM,
  },
] as const;

export function OpportunitiesSection({ onOpenForm }: OpportunitiesSectionProps) {
  return (
    <section
      id="opportunities"
      className="relative overflow-hidden bg-ink py-24 sm:py-32 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/10 to-transparent"
      />

      <div className="shell">
        <FadeIn>
          <SectionLabel index="07" label="فرص التعاون" />
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2
            className="text-gradient-mist mt-7 max-w-4xl font-black leading-[1.05] tracking-tight sm:mt-9"
            style={{ fontSize: 'clamp(2.25rem, 7vw, 6rem)' }}
          >
            عندك فكرة؟ خلّنا نسمعها.
          </h2>
        </FadeIn>

        <FadeIn delay={0.18}>
          <p className="mt-6 max-w-2xl text-sm leading-[1.9] text-mist/55 sm:text-base md:text-lg">
            نستقبل الأفكار والفرص الاستثمارية على مدار العام، ونراجعها بجدية.
            اختر ما يناسبك وابدأ من هنا.
          </p>
        </FadeIn>

        {/* البطاقتان */}
        <div className="mt-14 grid gap-5 sm:mt-20 sm:gap-6 lg:grid-cols-2">
          {CARDS.map((card, index) => {
            const Icon = card.icon;

            return (
              <FadeIn key={card.id} delay={0.1 * index} y={34}>
                <motion.article
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.45, ease: PREMIUM_EASE }}
                  style={{ willChange: 'transform' }}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.02] p-8 transition-colors duration-500 ease-premium hover:border-mist/25 sm:rounded-[40px] sm:p-12"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-32 end-[-15%] h-72 w-72 rounded-full opacity-0 blur-[90px] transition-opacity duration-700 ease-premium group-hover:opacity-100"
                    style={{
                      background:
                        index === 0
                          ? 'radial-gradient(circle, rgba(182,0,168,0.32) 0%, transparent 70%)'
                          : 'radial-gradient(circle, rgba(190,76,0,0.28) 0%, transparent 70%)',
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-mist transition-colors duration-500 ease-premium group-hover:border-accent/40 group-hover:text-white">
                        <Icon size={24} aria-hidden="true" />
                      </span>
                      <span className="font-latin text-xs tracking-[0.25em] text-mist/30">
                        {`0${index + 1}`}
                      </span>
                    </div>

                    <h3
                      className="mt-8 font-bold leading-tight tracking-tight text-white"
                      style={{ fontSize: 'clamp(1.5rem, 3.4vw, 2.5rem)' }}
                    >
                      {card.title}
                    </h3>

                    <p className="mt-4 max-w-lg text-sm leading-[1.9] text-mist/60 sm:text-base">
                      {card.description}
                    </p>
                  </div>

                  <div className="relative z-10 mt-10 flex flex-wrap items-center gap-4">
                    <ContactButton
                      label={card.cta}
                      onClick={() => onOpenForm(card.form)}
                    />
                  </div>
                </motion.article>
              </FadeIn>
            );
          })}
        </div>

        {/* واتساب */}
        <FadeIn delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-between gap-6 rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-7 sm:mt-12 sm:flex-row sm:rounded-[32px] sm:p-9">
            <div className="flex items-center gap-4 text-center sm:text-start">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-mist sm:flex">
                <MessageCircle size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-white sm:text-lg">
                  تفضّل التواصل المباشر؟
                </p>
                <p className="mt-1 text-sm text-mist/50">
                  راسلنا على واتساب وسنرد عليك في أقرب وقت.
                </p>
              </div>
            </div>

            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-mist/25 px-7 py-3.5 text-sm font-medium text-mist transition-colors duration-300 ease-premium hover:border-mist hover:bg-mist hover:text-ink sm:w-auto"
            >
              <MessageCircle size={17} aria-hidden="true" />
              تواصل معنا عبر واتساب
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export default OpportunitiesSection;
