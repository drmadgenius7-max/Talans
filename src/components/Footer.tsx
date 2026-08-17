import { ArrowUp } from 'lucide-react';
import Logo from './Logo';
import Magnet from './Magnet';
import FadeIn from './FadeIn';
import { scrollToSection } from './Navbar';
import { BRAND, CONTACT, NAV_LINKS } from '../data/site';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-[#080808]">
      {/* اسم المجموعة كخلفية ضخمة */}
      <span
        aria-hidden="true"
        className="font-latin pointer-events-none absolute -bottom-6 start-0 w-full select-none text-center text-[19vw] font-black uppercase leading-none text-white/[0.018] sm:-bottom-12"
      >
        TALANS
      </span>

      <div className="shell relative z-10 pb-10 pt-16 sm:pb-12 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* الهوية */}
          <div className="lg:col-span-5">
            <FadeIn>
              <Logo size={48} />
              <p className="mt-7 max-w-sm text-sm leading-[1.9] text-mist/50 sm:text-base">
                {BRAND.tagline}
              </p>
            </FadeIn>
          </div>

          {/* الروابط */}
          <div className="lg:col-span-3">
            <FadeIn delay={0.1}>
              <h3 className="text-xs font-medium tracking-[0.18em] text-mist/40">
                روابط سريعة
              </h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToSection(link.href);
                      }}
                      className="text-sm text-mist/65 transition-opacity duration-200 ease-premium hover:opacity-70"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>

          {/* التواصل */}
          <div className="lg:col-span-4">
            <FadeIn delay={0.2}>
              <h3 className="text-xs font-medium tracking-[0.18em] text-mist/40">
                للتواصل
              </h3>

              <ul className="mt-6 flex flex-col gap-3.5 text-sm">
                <li className="text-mist/65">{CONTACT.addressAr}</li>
                <li>
                  <a
                    href={`tel:${CONTACT.phoneIntl}`}
                    className="font-latin text-mist/65 transition-opacity duration-200 ease-premium hover:opacity-70"
                    dir="ltr"
                  >
                    {CONTACT.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="font-latin text-mist/65 transition-opacity duration-200 ease-premium hover:opacity-70"
                    dir="ltr"
                  >
                    {CONTACT.email}
                  </a>
                </li>
              </ul>
            </FadeIn>
          </div>
        </div>

        {/* الشريط السفلي */}
        <div className="mt-14 flex flex-col items-center justify-between gap-6 border-t border-white/[0.07] pt-8 sm:mt-20 sm:flex-row">
          <p className="text-center text-xs text-mist/35 sm:text-start sm:text-sm">
            <span className="font-latin inline-block" dir="ltr">
              © {year} {BRAND.nameEn}
            </span>
            <span className="mx-2 text-mist/20">—</span>
            جميع الحقوق محفوظة.
          </p>

          <Magnet strength={0.25}>
            <button
              type="button"
              onClick={() => scrollToSection('#hero')}
              aria-label="العودة إلى الأعلى"
              className="flex items-center gap-2.5 rounded-full border border-white/10 px-5 py-2.5 text-xs text-mist/60 transition-colors duration-300 ease-premium hover:border-mist/50 hover:text-mist"
            >
              <ArrowUp size={15} aria-hidden="true" />
              العودة للأعلى
            </button>
          </Magnet>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
