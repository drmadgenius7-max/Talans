import { ArrowUpLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Magnet from './Magnet';
import { PREMIUM_EASE } from './FadeIn';

interface LiveProjectButtonProps {
  label?: string;
  href?: string;
  onClick?: () => void;
  /** النسق: فاتح للخلفيات الداكنة، داكن للخلفيات البيضاء */
  tone?: 'light' | 'dark';
  className?: string;
  disabled?: boolean;
}

/**
 * زر ثانوي بحدود (Outline) مع مؤشر حي وسهم متحرك.
 * يُستخدم في بطاقات المشاريع وفي الأزرار الثانوية عمومًا.
 */
export function LiveProjectButton({
  label = 'استكشف المشروع',
  href,
  onClick,
  tone = 'light',
  className = '',
  disabled = false,
}: LiveProjectButtonProps) {
  const isLight = tone === 'light';

  const base = [
    'group inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-xs font-medium',
    'transition-colors duration-300 ease-premium sm:px-6 sm:py-3 sm:text-sm',
    isLight
      ? 'border-mist/25 text-mist hover:border-mist/70 hover:bg-mist hover:text-ink'
      : 'border-ink/20 text-ink hover:border-ink hover:bg-ink hover:text-mist',
    disabled ? 'pointer-events-none opacity-40' : '',
  ].join(' ');

  const inner = (
    <>
      <span
        aria-hidden="true"
        className={`relative flex h-1.5 w-1.5 shrink-0 rounded-full ${
          isLight ? 'bg-accent' : 'bg-accent'
        }`}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
      </span>
      <span>{label}</span>
      <ArrowUpLeft
        size={16}
        aria-hidden="true"
        className="transition-transform duration-300 ease-premium group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </>
  );

  return (
    <Magnet className={className} strength={0.2} disabled={disabled}>
      <motion.span
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        transition={{ duration: 0.3, ease: PREMIUM_EASE }}
        className="inline-flex"
        style={{ willChange: 'transform' }}
      >
        {href ? (
          <a
            className={base}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={disabled}
          >
            {inner}
          </a>
        ) : (
          <button className={base} type="button" onClick={onClick} disabled={disabled}>
            {inner}
          </button>
        )}
      </motion.span>
    </Magnet>
  );
}

export default LiveProjectButton;
