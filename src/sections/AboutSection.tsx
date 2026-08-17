import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import AnimatedText from '../components/AnimatedText';
import FadeIn from '../components/FadeIn';
import SectionLabel from '../components/SectionLabel';
import { ABOUT_COPY, STATS } from '../data/site';

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // انزياح خفيف للعنوان الضخم في الخلفية
  const ghostX = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative overflow-hidden bg-ink py-24 sm:py-32 lg:py-40"
    >
      {/* عنوان خلفي ضخم */}
      <motion.span
        aria-hidden="true"
        style={{ x: ghostX, willChange: 'transform' }}
        className="font-latin pointer-events-none absolute start-0 top-10 whitespace-nowrap text-[22vw] font-black uppercase leading-none text-white/[0.02]"
      >
        TALANS GROUP
      </motion.span>

      <div className="shell relative z-10">
        <FadeIn>
          <SectionLabel index="01" label="من نحن" />
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-gradient-mist mt-7 max-w-5xl font-black leading-[1.02] tracking-tight sm:mt-9">
            <span style={{ fontSize: 'clamp(2.25rem, 7vw, 6.5rem)' }}>
              {ABOUT_COPY.title}
            </span>
          </h2>
        </FadeIn>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <AnimatedText
              text={ABOUT_COPY.paragraphs[0]}
              className="text-lg font-light leading-[1.85] text-mist sm:text-2xl md:text-[1.75rem]"
            />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-5 lg:pt-3">
            {ABOUT_COPY.paragraphs.slice(1).map((paragraph, index) => (
              <FadeIn key={index} delay={0.1 * index}>
                <p className="text-sm leading-[1.9] text-mist/55 sm:text-base">
                  {paragraph}
                </p>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* أرقام المجموعة */}
        <div className="mt-20 border-t border-white/[0.08] pt-12 sm:mt-28 sm:pt-16">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4 lg:gap-x-10">
            {STATS.map((stat, index) => (
              <FadeIn key={stat.label} delay={0.08 * index} y={30}>
                <div className="group">
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span
                      className="text-gradient-bright font-latin block font-black leading-none tracking-tight"
                      style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}
                    >
                      {stat.value}
                    </span>
                    <span className="mt-4 block h-px w-full bg-white/10">
                      <span className="block h-px w-0 bg-accent transition-all duration-700 ease-premium group-hover:w-full" />
                    </span>
                    <span className="mt-4 block text-xs leading-relaxed text-mist/50 sm:text-sm">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              </FadeIn>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;
