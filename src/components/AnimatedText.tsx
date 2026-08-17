import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';

interface AnimatedTextProps {
  text: string;
  className?: string;
  /**
   * وحدة الكشف.
   * `word` هو الافتراضي لأن الحروف العربية متصلة، وفصلها حرفًا حرفًا
   * يكسر شكل الكلمة. استخدم `char` للنصوص اللاتينية فقط.
   */
  unit?: 'word' | 'char';
}

interface UnitProps {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}

function RevealUnit({ progress, range, children }: UnitProps) {
  const opacity = useTransform(progress, range, [0.2, 1]);

  return (
    <motion.span style={{ opacity }} className="inline-block">
      {children}
    </motion.span>
  );
}

/**
 * نص يتكشّف تدريجيًا مع تقدّم التمرير:
 * تبدأ كل وحدة بشفافية 0.2 وتصل إلى 1.
 */
export function AnimatedText({ text, className, unit = 'word' }: AnimatedTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  });

  const units = unit === 'char' ? Array.from(text) : text.split(' ');
  const total = units.length;

  return (
    <p ref={containerRef} className={className}>
      {units.map((value, index) => {
        const start = index / total;
        const end = (index + 1) / total;

        return (
          <span
            key={`${value}-${index}`}
            className={unit === 'word' ? 'inline-block ms-[0.26em] first:ms-0' : 'inline-block'}
          >
            <RevealUnit progress={scrollYProgress} range={[start, end]}>
              {value}
            </RevealUnit>
          </span>
        );
      })}
    </p>
  );
}

export default AnimatedText;
