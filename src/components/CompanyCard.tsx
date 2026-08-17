import { motion } from 'framer-motion';
import { ArrowUpLeft } from 'lucide-react';
import type { Company } from '../data/companies';
import { PREMIUM_EASE } from './FadeIn';

interface CompanyCardProps {
  company: Company;
  index: number;
}

/** بطاقة شركة/علامة تجارية داخل شبكة «شركاتنا» */
export function CompanyCard({ company, index }: CompanyCardProps) {
  const Wrapper = company.url ? motion.a : motion.article;

  return (
    <Wrapper
      {...(company.url
        ? { href: company.url, target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      className="group relative flex flex-col overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.02] transition-colors duration-500 ease-premium hover:border-mist/30 sm:rounded-[32px]"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, ease: PREMIUM_EASE }}
      style={{ willChange: 'transform' }}
    >
      {/* الصورة */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={company.image}
          alt={`العنصر البصري لـ ${company.name}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-premium group-hover:scale-[1.06]"
          style={{ willChange: 'transform' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

        <span className="absolute end-4 top-4 rounded-full border border-white/15 bg-ink/70 px-3 py-1 text-[0.65rem] font-medium text-mist/80 backdrop-blur-md">
          {company.status}
        </span>

        <span className="font-latin absolute bottom-4 start-5 text-4xl font-black text-white/10 sm:text-5xl">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* المحتوى */}
      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-latin truncate text-lg font-semibold text-white sm:text-xl">
              {company.name}
            </h3>
            <p className="mt-1 text-xs font-medium text-accent/90 sm:text-sm">
              {company.sector}
            </p>
          </div>

          {company.url && (
            <ArrowUpLeft
              size={18}
              aria-hidden="true"
              className="mt-1 shrink-0 text-mist/40 transition-all duration-300 ease-premium group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:text-mist"
            />
          )}
        </div>

        <p className="text-sm leading-relaxed text-mist/60">{company.description}</p>
      </div>

      {/* خط متوهّج أسفل البطاقة عند التحويم */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-gradient-to-l from-accent via-accent-violet to-accent-ember transition-transform duration-500 ease-premium group-hover:scale-x-100"
      />
    </Wrapper>
  );
}

export default CompanyCard;
