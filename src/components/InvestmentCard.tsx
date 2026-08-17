import { motion } from 'framer-motion';
import type { InvestmentPillar } from '../data/investment';
import { PREMIUM_EASE } from './FadeIn';

interface InvestmentCardProps {
  pillar: InvestmentPillar;
  index: number;
}

/** بطاقة محور استثماري */
export function InvestmentCard({ pillar, index }: InvestmentCardProps) {
  const Icon = pillar.icon;

  return (
    <motion.article
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-7 transition-colors duration-500 ease-premium hover:border-mist/25 sm:rounded-[34px] sm:p-9"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.45, ease: PREMIUM_EASE }}
      style={{ willChange: 'transform' }}
    >
      {/* توهّج خلفي عند التحويم */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-0 h-56 w-56 rounded-full opacity-0 blur-3xl transition-opacity duration-700 ease-premium group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle, rgba(182,0,168,0.35) 0%, rgba(118,33,176,0.12) 55%, transparent 75%)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-mist transition-colors duration-500 ease-premium group-hover:border-accent/40 group-hover:text-white">
            <Icon size={22} aria-hidden="true" />
          </span>
          <span className="font-latin text-5xl font-black leading-none text-white/[0.06] sm:text-6xl">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <h3 className="mt-7 text-2xl font-bold text-white sm:text-[1.75rem]">
          {pillar.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-mist/65 sm:text-base">
          {pillar.description}
        </p>
      </div>

      <ul className="relative z-10 mt-8 flex flex-wrap gap-2">
        {pillar.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist/55"
          >
            {tag}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export default InvestmentCard;
