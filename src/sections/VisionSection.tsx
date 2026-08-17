import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import AnimatedText from '../components/AnimatedText';
import FadeIn, { PREMIUM_EASE } from '../components/FadeIn';
import SectionLabel from '../components/SectionLabel';
import { VISION_COPY } from '../data/site';

export function VisionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const orbY = useTransform(scrollYProgress, [0, 1], ['18%', '-18%']);
  const orbScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.05, 0.85]);

  return (
    <section
      ref={sectionRef}
      id="vision"
      className="relative flex min-h-screen items-center overflow-hidden bg-ink py-28 supports-[height:100svh]:min-h-[100svh] sm:py-36"
    >
      {/* عنصر تجريدي في الخلفية */}
      <motion.div
        aria-hidden="true"
        style={{ y: orbY, scale: orbScale, willChange: 'transform' }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="relative h-[520px] w-[520px] sm:h-[680px] sm:w-[680px] lg:h-[820px] lg:w-[820px]">
          <div
            className="absolute inset-0 rounded-full blur-[120px]"
            style={{
              background:
                'radial-gradient(circle, rgba(118,33,176,0.2) 0%, rgba(182,0,168,0.09) 42%, transparent 68%)',
            }}
          />

          {[1, 0.78, 0.56, 0.34].map((ratio, index) => (
            <motion.span
              key={ratio}
              className="absolute left-1/2 top-1/2 rounded-full border border-mist/[0.07]"
              style={{
                width: `${ratio * 100}%`,
                height: `${ratio * 100}%`,
                x: '-50%',
                y: '-50%',
              }}
              animate={{ rotate: index % 2 === 0 ? 360 : -360 }}
              transition={{
                duration: 50 - index * 8,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      </motion.div>

      <div className="shell relative z-10">
        <FadeIn>
          <SectionLabel index="06" label="رؤيتنا" />
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2
            className="text-gradient-mist mt-8 font-black leading-none tracking-tight"
            style={{ fontSize: 'clamp(3rem, 11vw, 11rem)' }}
          >
            {VISION_COPY.title}
          </h2>
        </FadeIn>

        <div className="mt-12 max-w-4xl sm:mt-16">
          <AnimatedText
            text={VISION_COPY.lead}
            className="text-lg font-light leading-[1.85] text-mist sm:text-2xl md:text-[2rem] md:leading-[1.7]"
          />

          <FadeIn delay={0.15}>
            <div className="mt-10 flex items-start gap-5 border-t border-white/[0.08] pt-10">
              <span
                aria-hidden="true"
                className="mt-2 h-2 w-2 shrink-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(123deg, #B600A8 0%, #7621B0 60%, #BE4C00 100%)',
                }}
              />
              <p className="max-w-2xl text-sm leading-[1.9] text-mist/55 sm:text-lg">
                {VISION_COPY.follow}
              </p>
            </div>
          </FadeIn>
        </div>

        {/* شريط قيم مختصر */}
        <FadeIn delay={0.25}>
          <ul className="mt-16 flex flex-wrap gap-x-8 gap-y-4 sm:mt-20 sm:gap-x-14">
            {['ابتكار', 'استدامة', 'شراكة', 'أثر', 'نمو'].map((value, index) => (
              <motion.li
                key={value}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '50px', amount: 0 }}
                transition={{ duration: 0.6, delay: index * 0.07, ease: PREMIUM_EASE }}
                className="text-base font-medium text-mist/35 transition-colors duration-300 ease-premium hover:text-mist sm:text-xl"
              >
                {value}
              </motion.li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}

export default VisionSection;
