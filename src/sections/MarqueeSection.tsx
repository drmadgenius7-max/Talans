import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { MarqueeItem } from '../data/marquee';
import { MARQUEE_ROW_ONE, MARQUEE_ROW_TWO } from '../data/marquee';

interface RowProps {
  items: MarqueeItem[];
  x: MotionValue<string>;
}

function MarqueeRow({ items, x }: RowProps) {
  // نُكرّر العناصر لضمان امتلاء الشريط أثناء الحركة
  const track = [...items, ...items, ...items];

  return (
    <motion.div
      className="flex w-max gap-3"
      style={{ x, willChange: 'transform' }}
      aria-hidden="true"
    >
      {track.map((item, index) => (
        <figure
          key={`${item.id}-${index}`}
          className="group relative h-[168px] w-[260px] shrink-0 overflow-hidden rounded-[22px] sm:h-[220px] sm:w-[340px] sm:rounded-[28px] lg:h-[270px] lg:w-[420px]"
        >
          <img
            src={item.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
          <figcaption className="absolute bottom-4 start-5 text-sm font-medium text-mist/85 sm:text-base">
            {item.label}
          </figcaption>
        </figure>
      ))}
    </motion.div>
  );
}

/**
 * شبكة الأعمال — شريطان يتحركان في اتجاهين متعاكسين مع تمرير الصفحة.
 */
export function MarqueeSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const rowOneX = useTransform(scrollYProgress, [0, 1], ['-18%', '4%']);
  const rowTwoX = useTransform(scrollYProgress, [0, 1], ['2%', '-20%']);

  return (
    <section
      ref={sectionRef}
      aria-label="قطاعات ومجالات عمل المجموعة"
      className="relative overflow-hidden border-y border-white/[0.06] bg-ink py-14 sm:py-20"
    >
      <div className="flex flex-col gap-3">
        <MarqueeRow items={MARQUEE_ROW_ONE} x={rowOneX} />
        <MarqueeRow items={MARQUEE_ROW_TWO} x={rowTwoX} />
      </div>

      {/* تلاشٍ على الحواف */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent sm:w-32"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent sm:w-32"
      />
    </section>
  );
}

export default MarqueeSection;
