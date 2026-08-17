interface SectionLabelProps {
  /** رقم القسم — مثال: "02" */
  index?: string;
  label: string;
  /** النسق حسب خلفية القسم */
  tone?: 'light' | 'dark';
  className?: string;
}

/** عنوان صغير أعلى كل قسم — رقم + اسم القسم مع خط فاصل */
export function SectionLabel({
  index,
  label,
  tone = 'light',
  className = '',
}: SectionLabelProps) {
  const isLight = tone === 'light';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {index && (
        <span
          className={`font-latin text-xs font-semibold ${
            isLight ? 'text-accent' : 'text-accent'
          }`}
        >
          {index}
        </span>
      )}
      <span
        aria-hidden="true"
        className={`h-px w-10 ${isLight ? 'bg-mist/25' : 'bg-ink/20'}`}
      />
      <span
        className={`text-xs font-medium uppercase tracking-[0.16em] sm:text-sm ${
          isLight ? 'text-mist/60' : 'text-ink/60'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default SectionLabel;
