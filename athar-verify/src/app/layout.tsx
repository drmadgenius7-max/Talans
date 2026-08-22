import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'أثر للتحقق — تحقق من أصالة التوثيق',
    template: '%s | أثر للتحقق',
  },
  description:
    'أداة رسمية من متجر أثر للتحقق من أصالة فيديوهات التوثيق الميداني عبر البصمة الرقمية SHA-256 وتحليل تشابه المحتوى.',
  // Verification pages contain a customer's documentation; keep them out of
  // search engines entirely.
  robots: { index: false, follow: false, nocache: true },
  applicationName: 'Athar Verify',
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#101a16' },
  ],
};

/**
 * Root layout.
 *
 * `dir="rtl"` and `lang="ar"` are set at the document level, so every page,
 * form control, and scrollbar is right-to-left by default rather than by
 * per-component opt-in.
 *
 * Fonts are linked rather than bundled at build time: the app must build and
 * run in air-gapped environments, and the fallback stack below is a real
 * Arabic stack (not a Latin one), so a blocked font request degrades to a
 * correct-looking page instead of a broken one.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--font-arabic:'IBM Plex Sans Arabic','Noto Sans Arabic','Segoe UI','Tahoma',system-ui,sans-serif}`,
          }}
        />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
