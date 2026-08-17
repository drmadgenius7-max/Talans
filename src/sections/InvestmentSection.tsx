import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import FadeIn from '../components/FadeIn';
import InvestmentCard from '../components/InvestmentCard';
import SectionLabel from '../components/SectionLabel';
import { INVESTMENT_PILLARS, INVESTMENT_PROCESS } from '../data/investment';

export function InvestmentSection() {
  const timelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start 0.75', 'end 0.6'],
  });

  const lineScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <section
      id="investment"
      className="relative overflow-hidden bg-ink py-24 sm:py-32 lg:py-40"
    >
      {/* توهّج خلفي */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute start-1/2 top-0 h-[480px] w-[880px] -translate-x-1/2 blur-[160px]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(118,33,176,0.16) 0%, rgba(182,0,168,0.07) 45%, transparent 72%)',
        }}
      />

      <div className="shell relative z-10">
        <FadeIn>
          <SectionLabel index="03" label="استثماراتنا" />
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2
            className="text-gradient-mist mt-7 max-w-5xl font-black leading-[1.05] tracking-tight sm:mt-9"
            style={{ fontSize: 'clamp(2.25rem, 6vw, 5.5rem)' }}
          >
            نستثمر في الأفكار التي تستحق أن تنمو
          </h2>
        </FadeIn>

        <FadeIn delay={0.18}>
          <p className="mt-7 max-w-2xl text-sm leading-[1.9] text-mist/55 sm:text-base md:text-lg">
            ندخل شركاء في المشاريع الواعدة التي تمتلك فكرة واضحة وفريقًا قادرًا على
            التنفيذ، ونعمل معها على تطوير نموذج العمل وتسريع النمو والوصول إلى
            التوسع.
          </p>
        </FadeIn>

        {/* المحاور الثلاثة */}
        <div className="mt-14 grid gap-5 sm:mt-20 sm:gap-6 lg:grid-cols-3">
          {INVESTMENT_PILLARS.map((pillar, index) => (
            <FadeIn key={pillar.id} delay={0.08 * index} y={34}>
              <InvestmentCard pillar={pillar} index={index} />
            </FadeIn>
          ))}
        </div>

        {/* رحلة الاستثمار */}
        <div className="mt-24 sm:mt-32">
          <FadeIn>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h3
                className="font-black leading-tight tracking-tight text-white"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 3.25rem)' }}
              >
                رحلة الاستثمار
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-mist/50">
                مسار واضح من أول لقاء وحتى التوسع، نمشيه مع شركائنا خطوة بخطوة.
              </p>
            </div>
          </FadeIn>

          <div ref={timelineRef} className="relative mt-12 sm:mt-16">
            {/* الخط الأساسي */}
            <span
              aria-hidden="true"
              className="absolute bottom-0 start-[19px] top-2 w-px bg-white/[0.08] sm:start-[27px]"
            />
            {/* الخط المتقدّم مع التمرير */}
            <motion.span
              aria-hidden="true"
              className="absolute bottom-0 start-[19px] top-2 w-px origin-top sm:start-[27px]"
              style={{
                scaleY: lineScale,
                background:
                  'linear-gradient(180deg, #B600A8 0%, #7621B0 55%, #BE4C00 100%)',
                willChange: 'transform',
              }}
            />

            <ol className="flex flex-col gap-8 sm:gap-10">
              {INVESTMENT_PROCESS.map((step, index) => (
                <TimelineStep
                  key={step.number}
                  step={step}
                  progress={scrollYProgress}
                  range={[index / INVESTMENT_PROCESS.length, (index + 0.6) / INVESTMENT_PROCESS.length]}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

interface TimelineStepProps {
  step: (typeof INVESTMENT_PROCESS)[number];
  progress: ReturnType<typeof useScroll>['scrollYProgress'];
  range: [number, number];
}

function TimelineStep({ step, progress, range }: TimelineStepProps) {
  const opacity = useTransform(progress, range, [0.32, 1]);

  return (
    <motion.li style={{ opacity }} className="group relative flex gap-5 sm:gap-8">
      <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink text-[0.7rem] font-semibold text-mist/70 transition-colors duration-500 ease-premium group-hover:border-accent group-hover:text-white sm:h-14 sm:w-14 sm:text-sm">
        <span className="font-latin">{step.number}</span>
      </span>

      <div className="flex-1 border-b border-white/[0.07] pb-8 transition-colors duration-500 ease-premium group-hover:border-white/20 sm:pb-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <h4 className="text-xl font-bold text-white transition-transform duration-500 ease-premium group-hover:-translate-x-1 sm:text-3xl">
            {step.title}
          </h4>
          <p className="max-w-lg text-sm leading-relaxed text-mist/50 sm:text-base">
            {step.description}
          </p>
        </div>
      </div>
    </motion.li>
  );
}

export default InvestmentSection;
