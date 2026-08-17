import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Magnet from './Magnet';
import { PREMIUM_EASE } from './FadeIn';

interface ContactButtonProps {
  label?: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  /** يفتح الرابط في تبويب جديد */
  external?: boolean;
  ariaLabel?: string;
}

const GRADIENT =
  'linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)';

const SHADOW =
  '0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset';

/**
 * زر التواصل الأساسي — Pill بتدرّج الهوية مع تأثير مغناطيسي خفيف.
 */
export function ContactButton({
  label = 'تواصل معنا',
  href,
  onClick,
  icon,
  className = '',
  external = false,
  ariaLabel,
}: ContactButtonProps) {
  const content = (
    <motion.span
      className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold text-white sm:px-8 sm:py-4 sm:text-base"
      style={{ background: GRADIENT, boxShadow: SHADOW, willChange: 'transform' }}
      whileHover={{ scale: 1.035 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.3, ease: PREMIUM_EASE }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-premium group-hover:opacity-100"
        style={{
          background:
            'linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%)',
        }}
      />
      <span className="relative z-10">{label}</span>
      {icon && (
        <span className="relative z-10 flex items-center" aria-hidden="true">
          {icon}
        </span>
      )}
    </motion.span>
  );

  const shared = {
    className: 'inline-flex rounded-full focus-visible:outline-none',
    'aria-label': ariaLabel ?? label,
  };

  return (
    <Magnet className={className} strength={0.26}>
      {href ? (
        <a
          {...shared}
          href={href}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {content}
        </a>
      ) : (
        <button {...shared} type="button" onClick={onClick}>
          {content}
        </button>
      )}
    </Magnet>
  );
}

export default ContactButton;
