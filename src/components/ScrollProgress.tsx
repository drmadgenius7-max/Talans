import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * مؤشر تقدّم التمرير — خط رفيع جدًا أعلى الصفحة.
 * في وضع RTL يبدأ الخط من اليمين.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-right"
      style={{
        scaleX,
        background:
          'linear-gradient(90deg, #BE4C00 0%, #7621B0 45%, #B600A8 100%)',
        willChange: 'transform',
      }}
    />
  );
}

export default ScrollProgress;
