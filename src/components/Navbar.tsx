import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import Magnet from './Magnet';
import { PREMIUM_EASE } from './FadeIn';
import { NAV_LINKS, whatsappLink } from '../data/site';

/** تمرير ناعم إلى قسم مع مراعاة ارتفاع الشريط العلوي */
export function scrollToSection(href: string) {
  const target = document.querySelector(href);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({
    top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  });
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleNav = useCallback((event: React.MouseEvent, href: string) => {
    event.preventDefault();
    setOpen(false);
    // ننتظر إغلاق القائمة قبل التمرير حتى لا يتعارض قفل التمرير
    window.setTimeout(() => scrollToSection(href), 60);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: PREMIUM_EASE, delay: 0.1 }}
        className={`fixed inset-x-0 top-0 z-[60] transition-colors duration-300 ease-premium ${
          scrolled && !open
            ? 'border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav
          className="shell flex h-[68px] items-center justify-between sm:h-[76px]"
          aria-label="القائمة الرئيسية"
        >
          <a
            href="#hero"
            onClick={(event) => handleNav(event, '#hero')}
            className="rounded-lg"
            aria-label="مجموعة تالانس — الصفحة الرئيسية"
          >
            <Logo size={38} />
          </a>

          {/* قائمة سطح المكتب */}
          <ul className="hidden items-center gap-8 lg:flex xl:gap-10">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(event) => handleNav(event, link.href)}
                  className="text-sm font-medium text-mist transition-opacity duration-200 ease-premium hover:opacity-70"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <Magnet strength={0.22}>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-mist/25 px-5 py-2.5 text-sm font-medium text-mist transition-colors duration-300 ease-premium hover:border-mist hover:bg-mist hover:text-ink"
              >
                تواصل عبر واتساب
              </a>
            </Magnet>
          </div>

          {/* زر قائمة الجوال */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-mist/20 text-mist transition-colors duration-200 ease-premium hover:border-mist/60 lg:hidden"
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </motion.header>

      {/* قائمة الجوال */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: PREMIUM_EASE }}
            className="fixed inset-0 z-[55] bg-ink/95 backdrop-blur-2xl lg:hidden"
          >
            <div className="shell flex h-full flex-col justify-center pb-16 pt-24">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link, index) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.06 * index,
                      ease: PREMIUM_EASE,
                    }}
                    className="border-b border-white/[0.07]"
                  >
                    <a
                      href={link.href}
                      onClick={(event) => handleNav(event, link.href)}
                      className="flex items-baseline gap-4 py-4 text-3xl font-semibold text-mist transition-opacity duration-200 ease-premium hover:opacity-70 sm:text-4xl"
                    >
                      <span className="font-latin text-xs font-normal text-mist/35">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: PREMIUM_EASE }}
                className="mt-10"
              >
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full border border-mist/25 px-6 py-4 text-base font-medium text-mist transition-colors duration-300 ease-premium hover:border-mist hover:bg-mist hover:text-ink"
                >
                  تواصل معنا عبر واتساب
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
