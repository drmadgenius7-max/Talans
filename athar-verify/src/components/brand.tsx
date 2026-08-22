import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The Athar mark: a stylised "أ" inside a verification seal. Drawn inline so it
 * renders identically offline and on a printed certificate.
 */
export function AtharMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn('size-9', className)} aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M24 4.5c10.77 0 19.5 8.73 19.5 19.5S34.77 43.5 24 43.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M19 32V19.5c0-2.9 2.24-5 5-5s5 2.1 5 5V32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="24" cy="35.5" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="border-b border-border/70 bg-card/60 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-primary">
          <AtharMark />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold text-foreground">أثر للتحقق</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              تحقق من أصالة التوثيق
            </span>
          </span>
        </Link>

        {!compact && (
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/how-it-works"
              className="rounded-full px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              كيف نتحقق؟
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 py-8">
      <div className="container flex flex-col gap-3 text-center text-xs leading-relaxed text-muted-foreground">
        <p>
          نظام أثر للتحقق — يعتمد بشكل أساسي على مطابقة الملفات مع التوثيقات الأصلية المسجلة لدى
          متجر أثر.
        </p>
        <p className="opacity-80">© {new Date().getFullYear()} متجر أثر. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}
