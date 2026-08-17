import { useRef } from 'react';
import { useScroll } from 'framer-motion';
import FadeIn from '../components/FadeIn';
import ProjectCard from '../components/ProjectCard';
import SectionLabel from '../components/SectionLabel';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { PROJECTS } from '../data/projects';

export function ProjectsSection() {
  const stackRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ['start start', 'end end'],
  });

  const total = PROJECTS.length;

  return (
    <section
      id="projects"
      className="relative z-20 -mt-10 rounded-t-[40px] bg-ink pt-24 sm:-mt-12 sm:rounded-t-[50px] sm:pt-32 md:-mt-14 md:rounded-t-[60px] lg:pt-40"
    >
      <div className="shell">
        <FadeIn>
          <SectionLabel index="05" label="مشاريعنا" />
        </FadeIn>

        <div className="mt-7 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <FadeIn delay={0.1} className="lg:col-span-7">
            <h2
              className="text-gradient-mist font-black leading-[1.02] tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 7.5vw, 6.5rem)' }}
            >
              من الفكرة إلى الواقع
            </h2>
          </FadeIn>

          <FadeIn delay={0.2} className="lg:col-span-5">
            <p className="text-sm leading-[1.9] text-mist/55 sm:text-base">
              نماذج من المشاريع التي نبنيها ونستثمر فيها ونطوّرها داخل المجموعة —
              كل مشروع يبدأ بفكرة واضحة، ويكبر بخطة تنفيذ وشراكة صحيحة.
            </p>
          </FadeIn>
        </div>
      </div>

      {/* البطاقات المتكدّسة */}
      <div ref={stackRef} className="shell relative mt-14 pb-24 sm:mt-20 sm:pb-32">
        {PROJECTS.map((project, index) => {
          const targetScale = 1 - (total - 1 - index) * 0.03;

          return (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              progress={scrollYProgress}
              range={[index / total, 1]}
              targetScale={targetScale}
              stacked={isDesktop}
            />
          );
        })}
      </div>
    </section>
  );
}

export default ProjectsSection;
