import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import FadeIn from '../components/FadeIn';
import SectionLabel from '../components/SectionLabel';
import ContactButton from '../components/ContactButton';
import { CONTACT, CONTACT_COPY, whatsappLink } from '../data/site';

const CHANNELS = [
  {
    id: 'location',
    icon: MapPin,
    label: 'الموقع',
    value: CONTACT.addressAr,
    href: undefined as string | undefined,
  },
  {
    id: 'phone',
    icon: Phone,
    label: 'الهاتف',
    value: CONTACT.phoneDisplay,
    href: `tel:${CONTACT.phoneIntl}`,
  },
  {
    id: 'email',
    icon: Mail,
    label: 'البريد الإلكتروني',
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
  },
];

export function ContactSection() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-ink py-24 sm:py-32 lg:py-40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 start-1/2 h-[420px] w-[760px] -translate-x-1/2 blur-[150px]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(182,0,168,0.14) 0%, rgba(118,33,176,0.07) 45%, transparent 72%)',
        }}
      />

      <div className="shell relative z-10">
        <FadeIn>
          <SectionLabel index="08" label="تواصل معنا" />
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2
            className="text-gradient-mist mt-8 font-black leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(2.5rem, 9vw, 8rem)' }}
          >
            {CONTACT_COPY.title}
          </h2>
        </FadeIn>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <FadeIn delay={0.15}>
              <p className="max-w-xl text-base leading-[1.9] text-mist/60 sm:text-lg md:text-xl">
                {CONTACT_COPY.body}
              </p>
            </FadeIn>

            <FadeIn delay={0.25}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <ContactButton
                  label="تواصل معنا"
                  href={`mailto:${CONTACT.email}`}
                />

                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-full border border-mist/25 px-7 py-3.5 text-sm font-medium text-mist transition-colors duration-300 ease-premium hover:border-mist hover:bg-mist hover:text-ink sm:px-8 sm:py-4 sm:text-base"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  تواصل معنا عبر واتساب
                </a>
              </div>
            </FadeIn>
          </div>

          {/* قنوات التواصل */}
          <div className="lg:col-span-6">
            <ul className="border-t border-white/[0.08]">
              {CHANNELS.map((channel, index) => {
                const Icon = channel.icon;

                const content = (
                  <div className="flex items-center gap-5 py-6 sm:gap-7 sm:py-8">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-mist/70 transition-colors duration-500 ease-premium group-hover:border-accent/50 group-hover:text-white sm:h-12 sm:w-12">
                      <Icon size={18} aria-hidden="true" />
                    </span>

                    <div className="min-w-0">
                      <span className="block text-xs tracking-[0.14em] text-mist/40">
                        {channel.label}
                      </span>
                      <span
                        className="mt-1.5 block truncate text-base font-medium text-white sm:text-xl"
                        dir={channel.id === 'email' ? 'ltr' : undefined}
                        style={
                          channel.id === 'email' ? { textAlign: 'start' } : undefined
                        }
                      >
                        {channel.value}
                      </span>
                    </div>
                  </div>
                );

                return (
                  <li
                    key={channel.id}
                    className="group border-b border-white/[0.08]"
                  >
                    <FadeIn delay={0.08 * index} y={18}>
                      {channel.href ? (
                        <a href={channel.href} className="block">
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </FadeIn>
                  </li>
                );
              })}
            </ul>

            <FadeIn delay={0.3}>
              <p className="mt-6 text-xs text-mist/30">
                * البريد الإلكتروني أعلاه مبدئي ويمكن تحديثه من ملف الإعدادات.
              </p>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
