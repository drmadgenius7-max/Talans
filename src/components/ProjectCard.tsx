import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { Project } from '../data/projects';
import LiveProjectButton from './LiveProjectButton';

interface ProjectCardProps {
  project: Project;
  index: number;
  /** تقدّم التمرير لكامل قسم المشاريع */
  progress: MotionValue<number>;
  /** المدى الذي تتقلّص خلاله هذه البطاقة */
  range: [number, number];
  /** الحجم النهائي للبطاقة بعد تكدّسها */
  targetScale: number;
  /**
   * تفعيل التكدّس اللاصق.
   * يُعطّل على الشاشات الصغيرة حيث تُعرض البطاقات في تدفّق عادي
   * تجنّبًا لتجاوز المحتوى ارتفاع الشاشة.
   */
  stacked: boolean;
}

/**
 * بطاقة مشروع.
 * على الشاشات الكبيرة تثبت أثناء التمرير ثم تتقلّص تدريجيًا
 * لتظهر البطاقة التالية فوقها (Sticky Stacking).
 */
export function ProjectCard({
  project,
  index,
  progress,
  range,
  targetScale,
  stacked,
}: ProjectCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'start start'],
  });

  // حركة داخلية خفيفة للصور أثناء اقتراب البطاقة (Parallax)
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.18, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div
      ref={containerRef}
      className={
        stacked
          ? 'sticky top-0 flex h-screen items-center justify-center'
          : 'relative mb-6 sm:mb-8'
      }
    >
      <motion.article
        style={
          stacked
            ? {
                scale,
                top: `calc(-4vh + ${index * 28}px)`,
                willChange: 'transform',
              }
            : undefined
        }
        className="relative w-full origin-top overflow-hidden rounded-[40px] border-2 border-mist bg-ink p-6 sm:rounded-[50px] sm:p-8 md:rounded-[60px] md:p-9 lg:max-h-[88vh] lg:p-10 xl:p-12"
      >
        {/* أعلى البطاقة */}
        <header className="flex flex-col gap-6 border-b border-white/10 pb-6 sm:pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-latin text-sm font-semibold text-accent">
                {project.index}
              </span>
              <span className="h-px w-8 bg-mist/25" aria-hidden="true" />
              <span className="text-xs font-medium text-mist/55 sm:text-sm">
                {project.category}
              </span>
            </div>

            <h3
              className="font-latin mt-4 font-black uppercase leading-[0.95] tracking-tight text-white"
              style={{ fontSize: 'clamp(1.875rem, 5.5vw, 4.5rem)' }}
            >
              {project.name}
            </h3>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist/60 sm:text-base">
              {project.description}
            </p>
          </div>

          <div className="shrink-0">
            <LiveProjectButton
              label="استكشف المشروع"
              href={project.url}
              disabled={!project.url}
            />
          </div>
        </header>

        {/* النقاط المميزة */}
        <ul className="flex flex-wrap gap-2 pt-5 sm:gap-3 sm:pt-6">
          {project.highlights.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-xs text-mist/60 sm:text-sm"
            >
              {item}
            </li>
          ))}
        </ul>

        {/* شبكة الصور */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-7 sm:gap-4 md:grid-cols-3">
          {project.images.map((image, imageIndex) => (
            <div
              key={`${project.id}-${imageIndex}`}
              className={`relative aspect-[4/3] overflow-hidden rounded-[18px] sm:rounded-[24px] lg:aspect-[16/10] ${
                imageIndex === 2 ? 'col-span-2 md:col-span-1' : ''
              }`}
            >
              <motion.img
                src={image}
                alt={`عنصر بصري ${imageIndex + 1} من مشروع ${project.name}`}
                loading="lazy"
                decoding="async"
                style={{ scale: imageScale, willChange: 'transform' }}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </motion.article>
    </div>
  );
}

export default ProjectCard;
