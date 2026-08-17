import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export const PREMIUM_EASE = [0.25, 0.1, 0.25, 1] as const;

interface FadeInProps {
  children: ReactNode;
  /** تأخير بدء الحركة بالثواني */
  delay?: number;
  /** مدة الحركة بالثواني */
  duration?: number;
  /** الإزاحة الأفقية للبداية (px) */
  x?: number;
  /** الإزاحة الرأسية للبداية (px) */
  y?: number;
  className?: string;
}

/**
 * ظهور ناعم للعنصر عند دخوله إطار الشاشة.
 * يعمل مرة واحدة فقط لكل عنصر لتجنّب إعادة التشغيل عند التمرير للأعلى.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 24,
  className,
}: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{ duration, delay, ease: PREMIUM_EASE }}
    >
      {children}
    </motion.div>
  );
}

export default FadeIn;
