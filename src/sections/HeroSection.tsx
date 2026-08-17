import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import FadeIn, { PREMIUM_EASE } from '../components/FadeIn';
import Magnet from '../components/Magnet';
import { scrollToSection } from '../components/Navbar';
import { BRAND, HERO_COPY } from '../data/site';

/** نقاط ضوئية ثابتة الأماكن — تُحسب مرة واحدة */
const PARTICLES = [
  { x: 12, y: 24, size: 3, delay: 0 },
  { x: 26, y: 68, size: 2, delay: 0.8 },
  { x: 42, y: 18, size: 2, delay: 1.6 },
  { x: 63, y: 74, size: 3, delay: 0.4 },
  { x: 78, y: 32, size: 2, delay: 2.1 },
  { x: 88, y: 58, size: 3, delay: 1.2 },
  { x: 55, y: 44, size: 2, delay: 2.6 },
];

export function HeroSection() {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const springX = useSpring(pointerX, { stiffness: 60, damping: 20, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 20, mass: 0.6 });

  const orbX = useTransform(springX, [-1, 1], [28, -28]);
  const orbY = useTransform(springY, [-1, 1], [22, -22]);
  const glowX = useTransform(springX, [-1, 1], [-40, 40]);
  const glowY = useTransform(springY, [-1, 1], [-30, 30]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduced || !fine) return;

    const onMove = (event: MouseEvent) => {
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [pointerX, pointerY]);

  return (
    <section
      id="hero"
      className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-ink pb-10 pt-28 supports-[height:100svh]:min-h-[100svh] sm:pb-14 sm:pt-32"
    >
      {/* ---------- طبقات الخلفية ---------- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* شبكة خفيفة */}
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(215,226,234,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(215,226,234,0.045) 1px, transparent 1px)',
            backgroundSize: '78px 78px',
            maskImage:
              'radial-gradient(ellipse 75% 60% at 50% 40%, #000 30%, transparent 78%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 75% 60% at 50% 40%, #000 30%, transparent 78%)',
          }}
        />

        {/* توهّج الهوية */}
        <motion.div
          className="absolute start-[-10%] top-[6%] h-[520px] w-[520px] rounded-full blur-[130px]"
          style={{
            x: glowX,
            y: glowY,
            background:
              'radial-gradient(circle, rgba(182,0,168,0.24) 0%, rgba(118,33,176,0.12) 45%, transparent 70%)',
          }}
        />
        <motion.div
          className="absolute end-[-8%] bottom-[4%] h-[460px] w-[460px] rounded-full blur-[140px]"
          style={{
            x: glowY,
            y: glowX,
            background:
              'radial-gradient(circle, rgba(190,76,0,0.16) 0%, rgba(215,226,234,0.05) 50%, transparent 72%)',
          }}
        />

        {/* العنصر البصري التجريدي — طبقة خلفية محيطة */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center opacity-30 sm:opacity-45 lg:opacity-70"
          style={{ x: orbX, y: orbY }}
        >
          <HeroOrb />
        </motion.div>

        {/* نقاط ضوئية */}
        {PARTICLES.map((particle, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full bg-mist/40"
            style={{
              insetInlineStart: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
            }}
            animate={{ opacity: [0.15, 0.7, 0.15], y: [0, -14, 0] }}
            transition={{
              duration: 6 + index,
              delay: particle.delay,
              repeat: Infinity,
              ease: PREMIUM_EASE,
            }}
          />
        ))}
      </div>

      {/* ---------- المحتوى ---------- */}
      <div className="shell relative z-10">
        <FadeIn y={16} duration={0.8}>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="text-xs font-medium tracking-[0.2em] text-mist/65 sm:text-sm">
              {HERO_COPY.eyebrow}
            </span>
            <span className="hidden h-px w-16 bg-mist/20 sm:block" aria-hidden="true" />
            <span className="font-latin hidden text-xs uppercase tracking-[0.3em] text-mist/40 sm:block">
              {BRAND.nameEn}
            </span>
          </div>
        </FadeIn>
      </div>

      <div className="shell relative z-10 flex flex-1 items-center py-10 sm:py-14">
        <div className="relative w-full">
          <h1 className="relative z-10">
            {HERO_COPY.titleLines.map((line, index) => (
              <motion.span
                key={line}
                className="text-gradient-mist block font-black leading-[0.92] tracking-tight"
                style={{ fontSize: 'clamp(3rem, 12vw, 13rem)' }}
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 1,
                  delay: 0.15 + index * 0.12,
                  ease: PREMIUM_EASE,
                }}
              >
                {line}
              </motion.span>
            ))}
          </h1>
        </div>
      </div>

      <div className="shell relative z-10">
        <div className="flex flex-col gap-8 border-t border-white/[0.08] pt-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <FadeIn delay={0.5} className="max-w-xl">
            <p className="text-sm leading-relaxed text-mist/60 sm:text-base md:text-lg">
              {HERO_COPY.supporting}
            </p>
          </FadeIn>

          <FadeIn delay={0.65} y={18}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Magnet strength={0.24}>
                <button
                  type="button"
                  onClick={() => scrollToSection(HERO_COPY.primaryCta.href)}
                  className="w-full rounded-full bg-mist px-8 py-4 text-sm font-semibold text-ink transition-colors duration-300 ease-premium hover:bg-white sm:w-auto sm:text-base"
                >
                  {HERO_COPY.primaryCta.label}
                </button>
              </Magnet>

              <Magnet strength={0.24}>
                <button
                  type="button"
                  onClick={() => scrollToSection(HERO_COPY.secondaryCta.href)}
                  className="w-full rounded-full border border-mist/25 px-8 py-4 text-sm font-medium text-mist transition-colors duration-300 ease-premium hover:border-mist/70 hover:bg-white/[0.04] sm:w-auto sm:text-base"
                >
                  {HERO_COPY.secondaryCta.label}
                </button>
              </Magnet>
            </div>
          </FadeIn>
        </div>

        {/* مؤشر التمرير */}
        <motion.div
          className="mt-8 flex items-center justify-center gap-2 text-mist/30 sm:mt-10"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: PREMIUM_EASE }}
        >
          <ArrowDown size={14} aria-hidden="true" />
          <span className="text-[0.7rem] tracking-[0.2em]">مرّر للأسفل</span>
        </motion.div>
      </div>
    </section>
  );
}

/** عنصر بصري تجريدي: حلقات دوّارة حول شعار المجموعة */
function HeroOrb() {
  return (
    <div className="relative h-[260px] w-[260px] sm:h-[360px] sm:w-[360px] lg:h-[440px] lg:w-[440px]">
      {[
        { size: '100%', duration: 34, reverse: false, opacity: 0.16 },
        { size: '76%', duration: 26, reverse: true, opacity: 0.22 },
        { size: '52%', duration: 18, reverse: false, opacity: 0.3 },
      ].map((ring, index) => (
        <motion.span
          key={index}
          className="absolute left-1/2 top-1/2 rounded-full border border-mist"
          style={{
            width: ring.size,
            height: ring.size,
            x: '-50%',
            y: '-50%',
            opacity: ring.opacity,
            willChange: 'transform',
          }}
          animate={{ rotate: ring.reverse ? -360 : 360 }}
          transition={{ duration: ring.duration, repeat: Infinity, ease: 'linear' }}
        >
          <span
            className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
            style={{ background: index % 2 === 0 ? '#B600A8' : '#BE4C00' }}
          />
        </motion.span>
      ))}

      {/* نواة متوهّجة بدل عنصر صلب حتى لا ينافس العنوان */}
      <motion.span
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl sm:h-32 sm:w-32 lg:h-40 lg:w-40"
        style={{
          background:
            'radial-gradient(circle, rgba(215,226,234,0.22) 0%, rgba(182,0,168,0.16) 45%, transparent 72%)',
        }}
        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 7, repeat: Infinity, ease: PREMIUM_EASE }}
      />
    </div>
  );
}

export default HeroSection;
