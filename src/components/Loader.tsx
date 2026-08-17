import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from './Logo';
import { PREMIUM_EASE } from './FadeIn';

interface LoaderProps {
  /** مدة العرض بالمللي ثانية */
  duration?: number;
  onDone?: () => void;
}

/**
 * شاشة تحميل قصيرة تعرض شعار المجموعة.
 * تُقفل التمرير أثناء ظهورها ثم تنسحب للأعلى.
 */
export function Loader({ duration = 1500, onDone }: LoaderProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onDone]);

  // نقفل التمرير أثناء ظهور الشاشة فقط، ولا نلمس التمرير بعد اختفائها
  // حتى لا تتعارض المكوّنات التي تقفل التمرير أيضًا (القائمة والنماذج).
  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.9, ease: PREMIUM_EASE }}
          aria-hidden="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: PREMIUM_EASE }}
          >
            <Logo size={56} />
          </motion.div>

          <div className="mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-white/10 sm:w-56">
            <motion.div
              className="h-full w-full origin-right"
              style={{
                background:
                  'linear-gradient(90deg, #BE4C00 0%, #7621B0 50%, #B600A8 100%)',
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: duration / 1000, ease: PREMIUM_EASE }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Loader;
