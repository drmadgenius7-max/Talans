/**
 * مجموعة تالانس | TALANS GROUP
 * موقع تعريفي — React Artifact بملف واحد.
 *
 * القيود المحترمة هنا:
 *  - ملف واحد فقط، مقسّم داخلياً إلى Components.
 *  - لا localStorage / sessionStorage — الحالة عبر useState فقط.
 *  - المكتبات: react, motion/react (framer-motion), lucide-react, Tailwind (classes أساسية + arbitrary values).
 *  - كل المحتوى القابل للتعديل في ثوابت أعلى الملف.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowLeft,
  Menu,
  X,
  TrendingUp,
  Handshake,
  Cpu,
  Store,
  ShoppingCart,
  MonitorSmartphone,
  Briefcase,
  Megaphone,
  Building2,
  Layers,
  LineChart,
  Lightbulb,
  Search,
  ClipboardCheck,
  Rocket,
  Sprout,
  Globe,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  Check,
  ChevronLeft,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────
   1) الثوابت — عدّل من هنا دون لمس الـ UI
   ──────────────────────────────────────────────────────────────── */

/** ضع رابط صورة اللوجو هنا لاحقاً ليحل محل النسخة النصية */
const LOGO_SRC = null;

const C = {
  green: '#009e52',       // الأخضر الأساسي
  cta: '#1d6b38',         // زر CTA رئيسي
  ctaHover: '#144b27',    // hover للزر الرئيسي
  green2: '#008947',      // أزرار ثانوية
  white: '#FFFFFF',
};

const EASE = [0.25, 0.1, 0.25, 1];

const FONT_CDN = 'https://cdn.jsdelivr.net/npm/@dawod/thmanyah-font-web/index.css';

const SITE = {
  nameAr: 'مجموعة تالانس',
  nameEn: 'TALANS GROUP',
  title: 'مجموعة تالانس | TALANS GROUP — استثمار وتطوير الأعمال',
  description:
    'مجموعة تالانس مجموعة أعمال سعودية تعمل في الاستثمار، التجارة، التقنية، ريادة الأعمال وتطوير المشاريع.',
  heroTitleA: 'نبني الفرص.',
  heroTitleB: 'ونصنع ',
  heroTitleAccent: 'النمو.',
  heroSubtitle:
    'مجموعة أعمال سعودية تجمع بين الاستثمار، التجارة، التقنية وريادة الأعمال، لبناء مشاريع ذات أثر ونمو مستدام.',
  footerLine: 'نبني الفرص، نستثمر في النمو، ونصنع المستقبل.',
};

const NAV_LINKS = [
  { id: 'about', label: 'من نحن' },
  { id: 'sectors', label: 'قطاعاتنا' },
  { id: 'investment', label: 'استثماراتنا' },
  { id: 'projects', label: 'مشاريعنا' },
  { id: 'opportunities', label: 'فرص التعاون' },
  { id: 'contact', label: 'تواصل معنا' },
];

const HERO_FEATURES = [
  { icon: TrendingUp, title: 'تطوير الأعمال', text: 'من الفكرة إلى مشروع قابل للنمو.' },
  { icon: Handshake, title: 'استثمار وشراكات', text: 'شراكات استراتيجية تصنع قيمة طويلة المدى.' },
  { icon: Cpu, title: 'تقنية وابتكار', text: 'حلول رقمية تعالج احتياجاً حقيقياً.' },
];

const MARQUEE = [
  'التجارة',
  'الاستثمار',
  'التقنية',
  'ريادة الأعمال',
  'التجارة الإلكترونية',
  'الحلول الرقمية',
  'الخدمات',
  'تطوير الأعمال',
  'المنتجات',
  'الشراكات',
];

const ABOUT = {
  title: 'نبني اليوم، ونستثمر في الغد',
  paragraphs: [
    'مجموعة تالانس مجموعة أعمال سعودية تجمع بين الخبرة التجارية والاستثمارية وريادة الأعمال، ونعمل على بناء وتطوير واستثمار المشاريع التي تمتلك فرصاً حقيقية للنمو والتوسع.',
    'بخبرة تمتد لأكثر من عشر سنوات في عالم الأعمال والاستثمار، أسّسنا وطوّرنا أكثر من ١٠ شركات وعلامات تجارية، وشاركنا في أكثر من ١٥ استثماراً وشراكة في شركات ومشاريع بمجالات متعددة.',
    'نؤمن أن أفضل الفرص تبدأ بفكرة واضحة، وتنمو برؤية جريئة، وتنجح بالتنفيذ والشراكة الصحيحة.',
  ],
};

const STATS = [
  { value: '+10', label: 'شركات وعلامات تجارية' },
  { value: '+15', label: 'استثمارات وشراكات' },
  { value: '+10', label: 'سنوات من الخبرة' },
  { value: '1', label: 'رؤية واحدة للنمو' },
];

const SECTORS = [
  { icon: Store, name: 'التجارة', text: 'تطوير وتشغيل أنشطة تجارية بنماذج أعمال واضحة وقابلة للتوسع.' },
  { icon: ShoppingCart, name: 'التجارة الإلكترونية', text: 'بناء متاجر وعلامات رقمية تصل إلى عملائها مباشرة.' },
  { icon: MonitorSmartphone, name: 'التقنية والمنتجات الرقمية', text: 'منتجات رقمية تعالج احتياجاً حقيقياً وتبني قيمة متراكمة.' },
  { icon: Briefcase, name: 'الخدمات', text: 'خدمات احترافية تدعم نمو الشركات والمشاريع.' },
  { icon: Megaphone, name: 'التسويق', text: 'بناء العلامات ووصولها إلى السوق الصحيح.' },
  { icon: Building2, name: 'العقار', text: 'فرص عقارية بمنظور استثماري طويل المدى.' },
  { icon: Layers, name: 'الحلول الرقمية', text: 'أنظمة وحلول تُحسّن التشغيل وتُسرّع الأعمال.' },
  { icon: LineChart, name: 'تطوير الأعمال', text: 'تحويل الفرص إلى مشاريع منظّمة قابلة للنمو.' },
];

const INVESTMENT = {
  title: 'نستثمر في الأفكار التي تستحق أن تنمو',
  pillars: [
    { icon: Store, title: 'مشاريع تجارية', text: 'نموذج أعمال واضح وفرصة للنمو والتوسع.' },
    { icon: Cpu, title: 'مشاريع تقنية', text: 'منتجات وحلول تعالج احتياجاً حقيقياً وتبني قيمة طويلة المدى.' },
    { icon: Rocket, title: 'مشاريع ريادية', text: 'رواد أعمال لديهم رؤية واضحة وفريق قادر على التنفيذ.' },
  ],
  journey: [
    { no: '01', title: 'الفكرة', icon: Lightbulb },
    { no: '02', title: 'دراسة الفرصة', icon: Search },
    { no: '03', title: 'التقييم', icon: ClipboardCheck },
    { no: '04', title: 'الشراكة', icon: Handshake },
    { no: '05', title: 'النمو', icon: Sprout },
    { no: '06', title: 'التوسع', icon: Globe },
  ],
};

const SERVICES = [
  { no: '01', name: 'تطوير الأعمال', text: 'تطوير نماذج الأعمال وتحويل الأفكار والفرص إلى مشاريع قابلة للنمو والتوسع.' },
  { no: '02', name: 'الاستثمار', text: 'دراسة الفرص الاستثمارية والدخول في مشاريع وشركات ذات إمكانات نمو واضحة.' },
  { no: '03', name: 'تأسيس الشركات', text: 'المشاركة في بناء المشاريع من الفكرة وحتى الإطلاق والتوسع.' },
  { no: '04', name: 'الشراكات', text: 'بناء شراكات استراتيجية مع رواد الأعمال والشركات لتحقيق نمو مشترك.' },
  { no: '05', name: 'التجارة', text: 'تطوير وتشغيل المشاريع والأنشطة التجارية في قطاعات متعددة.' },
  { no: '06', name: 'التقنية والابتكار', text: 'الاستثمار ودعم المشاريع التقنية والمنتجات الرقمية والحلول المبتكرة.' },
];

/** نماذج توضيحية — لا تُقدَّم كمشاريع قائمة ولا تحمل أسماء علامات حقيقية */
const PROJECTS = [
  {
    no: '01',
    tag: 'تجارة',
    name: 'مشروع تجاري',
    text: 'بناء نموذج أعمال قابل للتوسع في السوق السعودي.',
  },
  {
    no: '02',
    tag: 'تقنية',
    name: 'مشروع تقني',
    text: 'حلول تقنية ومنتجات رقمية ذات قيمة حقيقية للمستخدمين والشركات.',
  },
  {
    no: '03',
    tag: 'ريادة أعمال',
    name: 'مشروع ريادي',
    text: 'دعم الأفكار الريادية الواعدة وتحويلها إلى فرص قابلة للنمو والاستثمار.',
  },
];

const CONTACT = {
  city: 'المملكة العربية السعودية — جدة',
  phoneDisplay: '+966 50 826 0161',
  phoneIntl: '966508260161',
  email: 'anasbinwali99@gmail.com',
  waMessage: 'السلام عليكم، لدي فكرة / فرصة استثمارية وأرغب في التواصل مع مجموعة تالانس.',
  title: 'خلنا نبني شيء يستحق',
  text: 'سواء كنت صاحب فكرة، رائد أعمال، مستثمراً، أو تبحث عن شريك لمشروع جديد، يسعدنا أن نسمع منك.',
};

const FORMS = {
  idea: {
    key: 'idea',
    title: 'عندي فكرة تجارية',
    intro: 'إذا عندك فكرة تجارية وتشوف أنها تستحق أن تتحول إلى مشروع حقيقي، شاركنا فكرتك.',
    cta: 'أرسل فكرتك',
    subjectPrefix: 'فكرة تجارية',
    projectNameField: 'projectName',
    fields: [
      { id: 'name', label: 'الاسم', type: 'text', required: true, placeholder: 'الاسم الكامل' },
      { id: 'phone', label: 'رقم الجوال', type: 'tel', required: true, placeholder: '05XXXXXXXX' },
      { id: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, placeholder: 'name@example.com' },
      { id: 'projectName', label: 'اسم الفكرة أو المشروع', type: 'text', required: false, placeholder: 'اسم مختصر' },
      { id: 'field', label: 'المجال', type: 'text', required: false, placeholder: 'تجارة، تقنية، خدمات…' },
      { id: 'description', label: 'وصف الفكرة', type: 'textarea', required: true, placeholder: 'اشرح الفكرة باختصار: المشكلة، الحل، ولمن موجّهة.' },
      { id: 'stage', label: 'المرحلة الحالية', type: 'select', required: false, options: ['فكرة', 'نموذج أولي', 'انطلاق مبكر', 'تشغيل فعلي', 'نمو'] },
      { id: 'amount', label: 'حجم الاستثمار المطلوب (اختياري)', type: 'text', required: false, placeholder: 'مثال: 250,000 ريال' },
      { id: 'link', label: 'رابط المشروع (اختياري)', type: 'url', required: false, placeholder: 'https://' },
    ],
  },
  invest: {
    key: 'invest',
    title: 'عندي مشروع وأبحث عن استثمار',
    intro: 'إذا عندك مشروع قائم أو فرصة استثمارية وتبحث عن شريك استراتيجي، شاركنا تفاصيل المشروع.',
    cta: 'قدّم فرصتك الاستثمارية',
    subjectPrefix: 'فرصة استثمارية',
    projectNameField: 'company',
    fields: [
      { id: 'name', label: 'اسم صاحب المشروع', type: 'text', required: true, placeholder: 'الاسم الكامل' },
      { id: 'phone', label: 'رقم الجوال', type: 'tel', required: true, placeholder: '05XXXXXXXX' },
      { id: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, placeholder: 'name@example.com' },
      { id: 'company', label: 'اسم الشركة / المشروع', type: 'text', required: false, placeholder: 'الاسم التجاري' },
      { id: 'sector', label: 'القطاع', type: 'text', required: false, placeholder: 'تجارة، تقنية، عقار…' },
      { id: 'stage', label: 'مرحلة المشروع', type: 'select', required: false, options: ['فكرة', 'نموذج أولي', 'انطلاق مبكر', 'تشغيل فعلي', 'نمو وتوسع'] },
      { id: 'description', label: 'نبذة عن المشروع', type: 'textarea', required: true, placeholder: 'نموذج العمل، السوق، الوضع الحالي، ولماذا الآن.' },
      { id: 'amount', label: 'حجم الاستثمار المطلوب', type: 'text', required: false, placeholder: 'مثال: 1,000,000 ريال' },
      { id: 'equity', label: 'نسبة الشراكة المقترحة (اختياري)', type: 'text', required: false, placeholder: 'مثال: 15%' },
      { id: 'link', label: 'رابط المشروع (اختياري)', type: 'url', required: false, placeholder: 'https://' },
    ],
  },
};

const SUCCESS_NOTE =
  'تم تجهيز طلبك. أكمل الإرسال من التطبيق الذي فُتح، وسيقوم فريق مجموعة تالانس بمراجعة المعلومات والتواصل معك.';

/* ────────────────────────────────────────────────────────────────
   2) أدوات مساعدة
   ──────────────────────────────────────────────────────────────── */

const scrollToId = (id) => {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const openExternal = (url) => {
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url;
};

const waLink = (message) =>
  `https://wa.me/${CONTACT.phoneIntl}?text=${encodeURIComponent(message)}`;

/** يبني نص الرسالة من قيم النموذج، سطراً لكل حقل معبّأ */
const buildMessageBody = (form, values) => {
  const lines = form.fields
    .filter((f) => (values[f.id] || '').trim() !== '')
    .map((f) => `${f.label.replace(' (اختياري)', '')}: ${values[f.id].trim()}`);
  lines.push('');
  lines.push(`— مُرسَل من موقع ${SITE.nameAr} (${SITE.nameEn})`);
  return lines.join('\n');
};

const buildSubject = (form, values) => {
  const projectName = (values[form.projectNameField] || '').trim();
  return projectName ? `${form.subjectPrefix} — ${projectName}` : form.subjectPrefix;
};

/** يحقن ملف خط ثمانية + أنماط أساسية مرة واحدة فقط */
function useThmanyahFont() {
  useEffect(() => {
    const LINK_ID = 'talans-thmanyah-font';
    const STYLE_ID = 'talans-base-style';

    if (!document.getElementById(LINK_ID)) {
      const link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href = FONT_CDN;
      // فشل تحميل الخط لا يكسر الموقع — الـ fallback يتكفّل
      link.onerror = () => {};
      document.head.appendChild(link);
    }

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .talans-app,
        .talans-app input,
        .talans-app textarea,
        .talans-app select,
        .talans-app button {
          font-family: 'Thmanyah Sans', 'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif;
        }
        .talans-display {
          font-family: 'Thmanyah Serif Display', 'Thmanyah Sans', 'IBM Plex Sans Arabic', Georgia, serif;
        }
        .talans-app { overflow-x: clip; }
        .talans-app ::selection { background: #009e5233; }
        .talans-no-scrollbar::-webkit-scrollbar { display: none; }
        .talans-app :focus-visible {
          outline: 2px solid #009e52;
          outline-offset: 3px;
          border-radius: 6px;
        }
        @media (prefers-reduced-motion: reduce) {
          .talans-app *, .talans-app *::before, .talans-app *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.title = SITE.title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = SITE.description;
  }, []);
}

/* ────────────────────────────────────────────────────────────────
   3) عناصر مشتركة
   ──────────────────────────────────────────────────────────────── */

function Sparkle({ size = 18, color = C.green, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M12 0.8c.55 4.9 2.4 7.4 7.2 8.2 1.5.25 1.5 1.75 0 2C14.4 11.8 12.55 14.3 12 19.2c-.28 2.4-1.72 2.4-2 0-.55-4.9-2.4-7.4-7.2-8.2-1.5-.25-1.5-1.75 0-2C7.6 8.2 9.45 5.7 10 .8c.28-2.4 1.72-2.4 2 0Z"
        fill={color}
      />
    </svg>
  );
}

function Logo({ tone = 'dark', size = 'md', className = '' }) {
  const isDark = tone === 'dark';
  const main = isDark ? 'text-slate-900' : 'text-white';
  const sub = isDark ? 'text-slate-500' : 'text-white/60';
  const sizes = {
    sm: { ar: 'text-[15px]', en: 'text-[8px] tracking-[0.34em]', sp: 14 },
    md: { ar: 'text-[19px]', en: 'text-[9px] tracking-[0.34em]', sp: 17 },
    lg: { ar: 'text-[26px]', en: 'text-[11px] tracking-[0.34em]', sp: 22 },
  }[size];

  if (LOGO_SRC) {
    return (
      <img
        src={LOGO_SRC}
        alt={`${SITE.nameAr} — ${SITE.nameEn}`}
        className={`h-9 w-auto object-contain sm:h-10 ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label={`${SITE.nameAr} ${SITE.nameEn}`}>
      <Sparkle size={sizes.sp} color={isDark ? C.green : '#ffffff'} />
      <span className="flex flex-col leading-none">
        <span className={`${sizes.ar} font-bold tracking-tight ${main}`}>{SITE.nameAr}</span>
        <span className={`${sizes.en} mt-1 font-medium uppercase ${sub}`} dir="ltr">
          {SITE.nameEn}
        </span>
      </span>
    </span>
  );
}

/** ظهور ناعم عند الدخول إلى الشاشة */
function FadeIn({ children, delay = 0, duration = 0.7, x = 0, y = 24, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** جذب مغناطيسي خفيف نحو مؤشر الماوس */
function Magnet({ children, strength = 0.28, radius = 130, className = '' }) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [near, setNear] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return undefined;
    const onMove = (e) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        setNear(true);
        setOffset({ x: dx * strength, y: dy * strength });
      } else if (dist < radius * 2) {
        setNear(false);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [radius, strength, reduce]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: near ? 'transform 0.3s ease-out' : 'transform 0.6s ease-in-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}

/**
 * كشف النص مع التمرير.
 * الوحدة هنا الكلمة وليست الحرف: تقسيم النص العربي إلى حروف منفصلة
 * يكسر اتصال الأحرف ويشوّه الخط، لذا الكشف يتم كلمةً كلمة.
 */
function RevealWord({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {children}
    </motion.span>
  );
}

function AnimatedText({ text, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  });
  const words = text.split(' ');

  if (reduce) {
    return (
      <p ref={ref} className={className}>
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = (i + 1) / words.length;
        return (
          <span key={`${word}-${i}`}>
            <RevealWord progress={scrollYProgress} range={[start, end]}>
              {word}
            </RevealWord>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
}

function SectionHeading({ eyebrow, title, text, align = 'start', tone = 'dark' }) {
  const alignCls = align === 'center' ? 'items-center text-center mx-auto' : 'items-start text-start';
  return (
    <div className={`flex max-w-3xl flex-col ${alignCls}`}>
      {eyebrow && (
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#009e52]/25 bg-[#009e52]/5 px-4 py-1.5 text-[12px] font-medium text-[#009e52]">
          <Sparkle size={12} />
          {eyebrow}
        </span>
      )}
      <h2
        className={`talans-display text-[28px] font-bold leading-[1.25] tracking-tight sm:text-[36px] md:text-[44px] ${
          tone === 'dark' ? 'text-slate-900' : 'text-white'
        }`}
      >
        {title}
      </h2>
      {text && (
        <p
          className={`mt-5 text-[15px] leading-[1.9] sm:text-[17px] ${
            tone === 'dark' ? 'text-slate-600' : 'text-white/70'
          }`}
        >
          {text}
        </p>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, className = '', icon: Icon = ArrowLeft, type = 'button', ariaLabel }) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-medium text-white transition-colors duration-200 ${className}`}
      style={{ backgroundColor: C.cta }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = C.ctaHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = C.cta;
      }}
    >
      {children}
      {Icon && <Icon size={17} className="transition-transform duration-300 group-hover:-translate-x-1" />}
    </button>
  );
}

function GhostButton({ children, onClick, className = '', icon: Icon = null, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full border border-[#009e52]/45 bg-white px-7 py-3.5 text-[15px] font-medium text-slate-900 transition-all duration-200 hover:border-[#009e52] hover:bg-[#009e52]/5 ${className}`}
    >
      {children}
      {Icon && <Icon size={17} className="text-[#009e52] transition-transform duration-300 group-hover:-translate-x-1" />}
    </button>
  );
}

function WhatsAppButton({ label = 'تواصل معنا عبر واتساب', className = '' }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(waLink(CONTACT.waMessage))}
      aria-label={label}
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-medium text-white transition-transform duration-200 hover:scale-[1.02] ${className}`}
      style={{ backgroundColor: C.green2 }}
    >
      <MessageCircle size={18} />
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   4) شريط التنقّل
   ──────────────────────────────────────────────────────────────── */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-[#009e52]"
      style={{ scaleX, transformOrigin: 'right center' }}
    />
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = useCallback((id) => {
    setOpen(false);
    // ننتظر إغلاق القائمة قبل التمرير حتى لا يتغيّر الارتفاع أثناء الحركة
    window.setTimeout(() => scrollToId(id), 80);
  }, []);

  return (
    <>
      <ScrollProgress />
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          solid ? 'border-b border-slate-100 bg-white/90 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto flex h-[70px] max-w-[1240px] items-center justify-between px-5 sm:px-8" aria-label="التنقل الرئيسي">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label={`${SITE.nameAr} — العودة إلى الأعلى`}
            className="shrink-0"
          >
            <Logo size="md" />
          </button>

          <div className="hidden items-center gap-8 lg:flex">
            <ul className="flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => go(link.id)}
                    className="text-[14.5px] font-medium text-slate-600 transition-colors duration-200 hover:text-[#009e52]"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
            <Magnet>
              <PrimaryButton onClick={() => go('contact')} className="px-6 py-2.5 text-[14px]">
                تواصل معنا
              </PrimaryButton>
            </Magnet>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-900 transition-colors hover:border-[#009e52] hover:text-[#009e52] lg:hidden"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden border-t border-slate-100 bg-white lg:hidden"
            >
              <ul className="mx-auto flex max-w-[1240px] flex-col gap-1 px-5 py-5 sm:px-8">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.35, ease: EASE }}
                  >
                    <button
                      type="button"
                      onClick={() => go(link.id)}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-3.5 text-[16px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#009e52]"
                    >
                      {link.label}
                      <ChevronLeft size={16} className="text-slate-300" />
                    </button>
                  </motion.li>
                ))}
                <li className="mt-3">
                  <PrimaryButton onClick={() => go('contact')} className="w-full">
                    تواصل معنا
                  </PrimaryButton>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   5) الواجهة الرئيسية — Hero
   ──────────────────────────────────────────────────────────────── */

/** عنصر بصري تجريدي: شبكة أعمال من عقد وخطوط + حلقات دوّارة */
function HeroVisual() {
  const reduce = useReducedMotion();
  const nodes = [
    { x: 200, y: 60, r: 7 },
    { x: 92, y: 140, r: 5 },
    { x: 310, y: 132, r: 5.5 },
    { x: 200, y: 200, r: 12 },
    { x: 70, y: 268, r: 6 },
    { x: 330, y: 262, r: 6.5 },
    { x: 152, y: 330, r: 5 },
    { x: 268, y: 344, r: 7 },
    { x: 200, y: 398, r: 5 },
  ];
  const edges = [
    [0, 3], [1, 3], [2, 3], [3, 4], [3, 5], [3, 6], [3, 7],
    [1, 0], [2, 0], [4, 6], [5, 7], [6, 8], [7, 8],
  ];

  return (
    <div className="relative h-[380px] w-full sm:h-[480px] md:h-[540px] lg:h-[600px]">
      <div className="absolute inset-0 -z-10 rounded-[48px] bg-gradient-to-br from-emerald-100/40 via-white to-blue-50/30 blur-2xl" />

      <svg
        viewBox="0 0 400 460"
        className="h-full w-full"
        role="img"
        aria-label="رسم تجريدي يمثّل شبكة أعمال مترابطة"
      >
        <defs>
          <radialGradient id="talansGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#009e52" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#009e52" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="talansEdge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#009e52" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#1d6b38" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        <circle cx="200" cy="210" r="190" fill="url(#talansGlow)" />

        {[150, 118, 86].map((r, i) => (
          <motion.circle
            key={r}
            cx="200"
            cy="210"
            r={r}
            fill="none"
            stroke="#009e52"
            strokeOpacity={0.12 + i * 0.04}
            strokeWidth="1"
            strokeDasharray={i === 1 ? '5 9' : undefined}
            style={{ transformOrigin: '200px 210px' }}
            animate={reduce ? undefined : { rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 90 + i * 30, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        <g>
          {edges.map(([a, b], i) => (
            <motion.line
              key={`e-${i}`}
              x1={nodes[a].x}
              y1={nodes[a].y}
              x2={nodes[b].x}
              y2={nodes[b].y}
              stroke="url(#talansEdge)"
              strokeWidth="1.1"
              initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
              animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.4 + i * 0.05, ease: EASE }}
            />
          ))}
        </g>

        <g>
          {nodes.map((n, i) => (
            <motion.g
              key={`n-${i}`}
              animate={reduce ? undefined : { y: [0, i % 2 === 0 ? -7 : 6, 0] }}
              transition={{ duration: 8 + (i % 4) * 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <circle cx={n.x} cy={n.y} r={n.r + 7} fill="#009e52" fillOpacity="0.07" />
              <circle cx={n.x} cy={n.y} r={n.r} fill={i === 3 ? C.cta : C.green} fillOpacity={i === 3 ? 1 : 0.85} />
            </motion.g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative flex min-h-[100vh] items-center overflow-hidden pt-[110px] pb-16 sm:pb-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-100/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-15%] left-[-8%] h-[380px] w-[380px] rounded-full bg-blue-50/20 blur-3xl animate-pulse" />
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#009e52]/25 bg-[#009e52]/5 px-4 py-1.5 text-[12.5px] font-medium text-[#009e52]"
            >
              <Sparkle size={13} />
              مجموعة أعمال سعودية
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="talans-display text-[34px] font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-[46px] md:text-[56px] lg:text-[60px]"
            >
              {SITE.heroTitleA}
              <br />
              {SITE.heroTitleB}
              <span style={{ color: C.green }}>{SITE.heroTitleAccent}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
              className="mt-6 max-w-xl text-[16px] leading-[1.95] text-slate-600 sm:text-[18px]"
            >
              {SITE.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Magnet>
                <PrimaryButton onClick={() => scrollToId('about')} className="w-full sm:w-auto">
                  اكتشف المجموعة
                </PrimaryButton>
              </Magnet>
              <GhostButton onClick={() => scrollToId('opportunities')} className="w-full sm:w-auto">
                لديك فرصة استثمارية؟
              </GhostButton>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            className="lg:col-span-6"
          >
            <HeroVisual />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
          className="mt-14 border-t border-slate-100 pt-10 sm:mt-16"
        >
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HERO_FEATURES.map((f, i) => (
              <div key={f.title} className="group relative flex items-start gap-4">
                {i > 0 && (
                  <span aria-hidden="true" className="absolute right-[-16px] top-1 hidden h-full w-px bg-slate-100 sm:block" />
                )}
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#009e52]/10 transition-colors duration-300 group-hover:bg-[#009e52]/15">
                  <f.icon size={19} className="text-[#009e52] transition-transform duration-300 group-hover:scale-110" />
                </span>
                <div>
                  <h3 className="text-[15.5px] font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-[1.8] text-slate-500">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   6) الشريط المتحرك — Marquee
   ──────────────────────────────────────────────────────────────── */

function MarqueeCard({ label, index }) {
  const tints = [
    'from-[#009e52]/10 via-white to-emerald-50',
    'from-slate-100 via-white to-[#009e52]/10',
    'from-emerald-50 via-white to-blue-50/60',
  ];
  return (
    <div
      className={`flex h-[150px] w-[240px] shrink-0 flex-col justify-between rounded-[26px] border border-slate-100 bg-gradient-to-br p-5 sm:h-[200px] sm:w-[320px] md:h-[270px] md:w-[420px] md:rounded-[34px] md:p-7 ${
        tints[index % tints.length]
      }`}
    >
      <svg viewBox="0 0 120 60" className="h-8 w-24 opacity-70 md:h-12 md:w-32" aria-hidden="true">
        <path
          d="M4 52 C 26 52, 30 16, 52 24 S 84 44, 116 8"
          fill="none"
          stroke={C.green}
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
        <circle cx="116" cy="8" r="5" fill={C.cta} />
      </svg>
      <span className="text-[15px] font-bold text-slate-800 md:text-[20px]">{label}</span>
    </div>
  );
}

function MarqueeRow({ items, direction = 1 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], [`${-14 * direction}%`, `${14 * direction}%`]);
  const loop = [...items, ...items];

  return (
    <div ref={ref} className="overflow-hidden">
      <motion.div
        className="flex w-max gap-3"
        style={reduce ? undefined : { x, willChange: 'transform' }}
      >
        {loop.map((label, i) => (
          <MarqueeCard key={`${label}-${i}`} label={label} index={i} />
        ))}
      </motion.div>
    </div>
  );
}

function MarqueeSection() {
  const half = Math.ceil(MARQUEE.length / 2);
  return (
    <section aria-label="قطاعات المجموعة" className="relative overflow-hidden py-10 sm:py-14">
      <div className="flex flex-col gap-3">
        <MarqueeRow items={MARQUEE.slice(0, half)} direction={1} />
        <MarqueeRow items={MARQUEE.slice(half)} direction={-1} />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   7) من نحن + الأرقام
   ──────────────────────────────────────────────────────────────── */

function AboutSection() {
  return (
    <section id="about" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <FadeIn>
          <SectionHeading eyebrow="من نحن" title={ABOUT.title} />
        </FadeIn>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="flex flex-col gap-6">
              {ABOUT.paragraphs.map((p, i) => (
                <AnimatedText
                  key={i}
                  text={p}
                  className={`text-[15.5px] leading-[2.05] sm:text-[17.5px] ${
                    i === 0 ? 'font-medium text-slate-800' : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <FadeIn x={-20} y={0} delay={0.1}>
              <div className="rounded-[36px] border border-slate-100 bg-slate-50/60 p-7 sm:p-9">
                <div className="grid grid-cols-2 gap-x-6 gap-y-9">
                  {STATS.map((s) => (
                    <div key={s.label}>
                      <div
                        className="talans-display text-[42px] font-bold leading-none tracking-tight sm:text-[52px]"
                        style={{ color: C.green }}
                      >
                        {s.value}
                      </div>
                      <div className="mt-3 text-[13.5px] leading-[1.7] text-slate-600">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   8) قطاعاتنا
   ──────────────────────────────────────────────────────────────── */

function SectorCard({ sector, index }) {
  return (
    <FadeIn delay={index * 0.06}>
      <article className="group relative h-full rounded-[28px] border border-slate-100 bg-white p-6 transition-all duration-300 hover:border-slate-200 hover:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] sm:p-7">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#009e52]/5 transition-colors duration-300 group-hover:bg-[#009e52]/15">
          <sector.icon size={21} className="text-[#009e52] transition-transform duration-300 group-hover:scale-110" />
        </span>
        <h3 className="text-[17px] font-bold text-slate-900">{sector.name}</h3>
        <p className="mt-2.5 text-[14px] leading-[1.85] text-slate-500">{sector.text}</p>
        <span
          aria-hidden="true"
          className="absolute inset-x-6 bottom-0 h-px origin-right scale-x-0 bg-[#009e52] transition-transform duration-500 group-hover:scale-x-100"
        />
      </article>
    </FadeIn>
  );
}

function SectorsSection() {
  return (
    <section id="sectors" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <FadeIn>
          <SectionHeading
            eyebrow="قطاعاتنا"
            title="قطاعات نعمل فيها"
            text="نعمل عبر مظلة المجموعة في قطاعات متعددة، بنموذج بناء وتشغيل واستثمار."
          />
        </FadeIn>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SECTORS.map((sector, i) => (
            <SectorCard key={sector.name} sector={sector} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   9) الاستثمار + رحلة الاستثمار
   ──────────────────────────────────────────────────────────────── */

function InvestmentJourney() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.6'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <div ref={ref} className="relative mt-20">
      <span aria-hidden="true" className="absolute right-[19px] top-2 bottom-2 w-px bg-slate-100 sm:right-[23px]" />
      <motion.span
        aria-hidden="true"
        className="absolute right-[19px] top-2 bottom-2 w-px bg-[#009e52] sm:right-[23px]"
        style={reduce ? { transformOrigin: 'top' } : { scaleY, transformOrigin: 'top' }}
      />

      <ol className="flex flex-col gap-9">
        {INVESTMENT.journey.map((step, i) => (
          <FadeIn key={step.no} delay={i * 0.08} x={-16} y={0}>
            <li className="group flex items-start gap-5 sm:gap-7">
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors duration-300 group-hover:border-[#009e52] sm:h-12 sm:w-12">
                <step.icon size={18} className="text-[#009e52]" />
              </span>
              <div className="pt-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] font-bold tabular-nums text-slate-300" dir="ltr">
                    {step.no}
                  </span>
                  <h4 className="text-[17px] font-bold text-slate-900 sm:text-[19px]">{step.title}</h4>
                </div>
              </div>
            </li>
          </FadeIn>
        ))}
      </ol>
    </div>
  );
}

function InvestmentSection() {
  return (
    <section id="investment" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <FadeIn>
          <SectionHeading eyebrow="استثماراتنا" title={INVESTMENT.title} />
        </FadeIn>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {INVESTMENT.pillars.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.08}>
              <article className="group h-full rounded-[30px] border border-slate-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_-38px_rgba(15,23,42,0.4)] sm:p-8">
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#009e52]/5 transition-colors duration-300 group-hover:bg-[#009e52]/15">
                  <p.icon size={21} className="text-[#009e52]" />
                </span>
                <h3 className="text-[19px] font-bold text-slate-900">{p.title}</h3>
                <p className="mt-3 text-[14.5px] leading-[1.9] text-slate-500">{p.text}</p>
              </article>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.1}>
          <h3 className="mt-20 text-[20px] font-bold text-slate-900 sm:text-[24px]">رحلة الاستثمار</h3>
        </FadeIn>
        <InvestmentJourney />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   10) ماذا نقدم؟
   ──────────────────────────────────────────────────────────────── */

function ServicesSection() {
  return (
    <section className="rounded-t-[40px] bg-slate-50 py-20 sm:rounded-t-[50px] sm:py-28 md:rounded-t-[60px]">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <FadeIn>
          <SectionHeading eyebrow="خدماتنا" title="ماذا نقدم؟" />
        </FadeIn>

        <div className="mt-12 border-t border-slate-200">
          {SERVICES.map((s, i) => (
            <FadeIn key={s.no} delay={i * 0.06}>
              <article className="group border-b border-slate-200 py-7 transition-transform duration-300 hover:-translate-x-1.5 sm:py-9">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-10">
                  <span
                    className="talans-display text-[34px] font-bold leading-none tabular-nums text-slate-200 transition-colors duration-300 group-hover:text-[#009e52] sm:text-[44px]"
                    dir="ltr"
                  >
                    {s.no}
                  </span>
                  <div className="flex-1 sm:flex sm:items-start sm:gap-10">
                    <h3 className="text-[19px] font-bold text-slate-900 sm:w-[260px] sm:shrink-0 sm:text-[22px]">
                      {s.name}
                    </h3>
                    <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.95] text-slate-500 sm:mt-1">{s.text}</p>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   11) المشاريع — بطاقات متراكمة Sticky
   ──────────────────────────────────────────────────────────────── */

/** عناصر بصرية تجريدية داخل بطاقة المشروع — لا صور خارجية */
function ProjectVisuals({ seed }) {
  const shapes = [0, 1, 2].map((i) => (seed + i) % 3);
  return (
    <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
      {shapes.map((shape, i) => (
        <div
          key={i}
          className="h-[120px] overflow-hidden rounded-[22px] border border-slate-100 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 sm:h-[150px]"
        >
          <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
            {shape === 0 && (
              <>
                <rect x="24" y="70" width="22" height="30" rx="6" fill={C.green} fillOpacity="0.25" />
                <rect x="58" y="52" width="22" height="48" rx="6" fill={C.green} fillOpacity="0.4" />
                <rect x="92" y="34" width="22" height="66" rx="6" fill={C.green} fillOpacity="0.6" />
                <rect x="126" y="20" width="22" height="80" rx="6" fill={C.cta} fillOpacity="0.85" />
              </>
            )}
            {shape === 1 && (
              <>
                <circle cx="100" cy="60" r="40" fill="none" stroke={C.green} strokeOpacity="0.3" strokeWidth="2" />
                <circle cx="100" cy="60" r="26" fill="none" stroke={C.green} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="4 7" />
                <circle cx="100" cy="60" r="11" fill={C.cta} fillOpacity="0.9" />
              </>
            )}
            {shape === 2 && (
              <>
                <path
                  d="M20 96 C 56 96, 62 40, 96 52 S 152 82, 182 24"
                  fill="none"
                  stroke={C.green}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeOpacity="0.6"
                />
                <circle cx="182" cy="24" r="6" fill={C.cta} />
                <circle cx="96" cy="52" r="4" fill={C.green} fillOpacity="0.7" />
              </>
            )}
          </svg>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project, index, total, progress }) {
  const reduce = useReducedMotion();
  const targetScale = 1 - (total - 1 - index) * 0.03;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

  return (
    <div
      className="sticky mb-8 flex justify-center"
      style={{ top: `calc(6rem + ${index * 28}px)` }}
    >
      <motion.article
        style={reduce ? undefined : { scale, willChange: 'transform' }}
        className="w-full rounded-[40px] border border-slate-200 bg-white p-7 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.45)] sm:rounded-[50px] sm:p-10 md:rounded-[60px] md:p-14"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="talans-display text-[15px] font-bold tabular-nums text-slate-300" dir="ltr">
                {project.no}
              </span>
              <span className="rounded-full border border-[#009e52]/25 bg-[#009e52]/5 px-3.5 py-1 text-[12px] font-medium text-[#009e52]">
                {project.tag}
              </span>
            </div>
            <h3 className="talans-display mt-5 text-[26px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[34px] md:text-[40px]">
              {project.name}
            </h3>
            <p className="mt-4 text-[15px] leading-[1.95] text-slate-600 sm:text-[16.5px]">{project.text}</p>
          </div>

          <GhostButton
            onClick={() => scrollToId('opportunities')}
            icon={ArrowLeft}
            className="shrink-0 self-start"
            ariaLabel={`استكشف ${project.name}`}
          >
            استكشف المشروع
          </GhostButton>
        </div>

        <ProjectVisuals seed={index} />
      </motion.article>
    </div>
  );
}

function ProjectsSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section id="projects" className="scroll-mt-24 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <FadeIn>
          <SectionHeading
            eyebrow="مشاريعنا"
            title="من الفكرة إلى الواقع"
            text="نماذج توضيحية لطريقة عملنا في بناء المشاريع وتطويرها والاستثمار فيها."
          />
        </FadeIn>

        <div ref={containerRef} className="relative mt-14">
          {PROJECTS.map((project, i) => (
            <ProjectCard
              key={project.no}
              project={project}
              index={i}
              total={PROJECTS.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   12) فرص التعاون + النماذج
   ──────────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+]?[\d\s()-]{8,}$/;

function validate(form, values) {
  const errors = {};
  form.fields.forEach((f) => {
    if (f.required && !(values[f.id] || '').trim()) {
      errors[f.id] = 'هذا الحقل مطلوب';
    }
  });
  const email = (values.email || '').trim();
  if (email && !EMAIL_RE.test(email)) errors.email = 'أدخل بريداً إلكترونياً صحيحاً';
  const phone = (values.phone || '').trim();
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'أدخل رقم جوال صحيحاً';
  return errors;
}

function Field({ field, value, error, onChange }) {
  const id = `talans-${field.id}`;
  const base =
    'w-full rounded-2xl border bg-white px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-300 transition-colors duration-200 focus:border-[#009e52] focus:outline-none';
  const border = error ? 'border-red-300' : 'border-slate-200';

  return (
    <div className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-medium text-slate-700">
        {field.label}
        {field.required && <span className="mr-1 text-[#009e52]">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={4}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={Boolean(error)}
          className={`${base} ${border} resize-y leading-[1.8]`}
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={Boolean(error)}
          className={`${base} ${border}`}
        >
          <option value="">اختر…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
          aria-invalid={Boolean(error)}
          dir={field.type === 'email' || field.type === 'url' || field.type === 'tel' ? 'ltr' : undefined}
          className={`${base} ${border} ${
            field.type === 'email' || field.type === 'url' || field.type === 'tel' ? 'text-start' : ''
          }`}
        />
      )}

      {error && <p className="mt-1.5 text-[12.5px] text-red-500">{error}</p>}
    </div>
  );
}

function OpportunityForm({ form, onClose }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const setValue = (id, val) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev));
  };

  const submit = (channel) => {
    const found = validate(form, values);
    setErrors(found);
    if (Object.keys(found).some((k) => found[k])) {
      const first = form.fields.find((f) => found[f.id]);
      if (first) document.getElementById(`talans-${first.id}`)?.focus();
      return;
    }

    const subject = buildSubject(form, values);
    const body = buildMessageBody(form, values);

    if (channel === 'email') {
      openExternal(`mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      openExternal(waLink(`${subject}\n\n${body}`));
    }
    setSent(true);
  };

  return (
    <div className="flex max-h-[88vh] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
        <div>
          <h3 className="text-[19px] font-bold text-slate-900 sm:text-[21px]">{form.title}</h3>
          <p className="mt-1.5 text-[13.5px] leading-[1.8] text-slate-500">{form.intro}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق النموذج"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <X size={17} />
        </button>
      </div>

      <div className="talans-no-scrollbar flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        {sent ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#009e52]/10">
              <Check size={28} className="text-[#009e52]" />
            </span>
            <p className="mt-6 max-w-md text-[15.5px] leading-[1.95] text-slate-700">{SUCCESS_NOTE}</p>
            <GhostButton onClick={onClose} className="mt-8">
              إغلاق
            </GhostButton>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit('email');
            }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            noValidate
          >
            {form.fields.map((f) => (
              <Field key={f.id} field={f} value={values[f.id] || ''} error={errors[f.id]} onChange={setValue} />
            ))}
          </form>
        )}
      </div>

      {!sent && (
        <div className="border-t border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton onClick={() => submit('email')} icon={Send} className="w-full sm:flex-1">
              إرسال عبر البريد
            </PrimaryButton>
            <button
              type="button"
              onClick={() => submit('whatsapp')}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[15px] font-medium text-white transition-transform duration-200 hover:scale-[1.02] sm:flex-1"
              style={{ backgroundColor: C.green2 }}
            >
              <MessageCircle size={18} />
              إرسال عبر واتساب
            </button>
          </div>
          <p className="mt-3.5 text-center text-[12.5px] leading-[1.8] text-slate-400">
            يُفتح تطبيق البريد أو واتساب لديك بالبيانات جاهزة، وتكمل الإرسال منه.
          </p>
        </div>
      )}
    </div>
  );
}

function FormModal({ form, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={form.title}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.99 }}
        transition={{ duration: 0.35, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-t-[32px] bg-white sm:rounded-[32px]"
      >
        <OpportunityForm form={form} onClose={onClose} />
      </motion.div>
    </motion.div>
  );
}

function OpportunitiesSection({ onOpen }) {
  const cards = [FORMS.idea, FORMS.invest];
  return (
    <section id="opportunities" className="scroll-mt-24 bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <FadeIn>
          <SectionHeading
            eyebrow="فرص التعاون"
            title="عندك فكرة؟ خلنا نسمعها."
            text="نستقبل الأفكار والفرص الاستثمارية، ونراجعها بجدية مع أصحابها."
          />
        </FadeIn>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {cards.map((card, i) => (
            <FadeIn key={card.key} delay={i * 0.1}>
              <article className="group flex h-full flex-col justify-between rounded-[36px] border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-45px_rgba(15,23,42,0.45)] sm:p-10">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#009e52]/5">
                    {card.key === 'idea' ? (
                      <Lightbulb size={21} className="text-[#009e52]" />
                    ) : (
                      <Handshake size={21} className="text-[#009e52]" />
                    )}
                  </span>
                  <h3 className="talans-display mt-6 text-[22px] font-bold leading-tight text-slate-900 sm:text-[26px]">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-[15px] leading-[1.95] text-slate-600">{card.intro}</p>
                </div>
                <div className="mt-8">
                  <PrimaryButton onClick={() => onOpen(card.key)} className="w-full sm:w-auto">
                    {card.cta}
                  </PrimaryButton>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.15}>
          <div className="mt-10 flex flex-col items-center gap-4 rounded-[32px] border border-slate-200 bg-white px-7 py-8 text-center sm:flex-row sm:justify-between sm:text-start">
            <p className="text-[15px] leading-[1.9] text-slate-600">
              تفضّل التواصل المباشر؟ راسلنا على واتساب وسنرد عليك في أقرب وقت.
            </p>
            <WhatsAppButton className="w-full shrink-0 sm:w-auto" />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   13) تواصل معنا
   ──────────────────────────────────────────────────────────────── */

function ContactSection() {
  const items = [
    { icon: MapPin, label: 'الموقع', value: CONTACT.city, action: null },
    {
      icon: Phone,
      label: 'الجوال / واتساب',
      value: CONTACT.phoneDisplay,
      action: () => openExternal(waLink(CONTACT.waMessage)),
      ltr: true,
    },
    {
      icon: Mail,
      label: 'البريد الإلكتروني',
      value: CONTACT.email,
      action: () => openExternal(`mailto:${CONTACT.email}`),
      ltr: true,
    },
  ];

  return (
    <section id="contact" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <FadeIn>
              <SectionHeading eyebrow="تواصل معنا" title={CONTACT.title} text={CONTACT.text} />
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Magnet>
                  <WhatsAppButton className="w-full sm:w-auto" />
                </Magnet>
                <GhostButton onClick={() => scrollToId('opportunities')} className="w-full sm:w-auto">
                  أرسل فكرتك أو فرصتك
                </GhostButton>
              </div>
            </FadeIn>
          </div>

          <div className="lg:col-span-6">
            <FadeIn delay={0.1} x={-20} y={0}>
              <div className="rounded-[36px] border border-slate-100 bg-slate-50/60 p-7 sm:p-9">
                <ul className="flex flex-col gap-7">
                  {items.map((item) => (
                    <li key={item.label} className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
                        <item.icon size={18} className="text-[#009e52]" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-slate-400">{item.label}</div>
                        {item.action ? (
                          <button
                            type="button"
                            onClick={item.action}
                            dir={item.ltr ? 'ltr' : undefined}
                            className="mt-1 block max-w-full truncate text-start text-[15.5px] font-medium text-slate-900 transition-colors hover:text-[#009e52]"
                          >
                            {item.value}
                          </button>
                        ) : (
                          <div className="mt-1 text-[15.5px] font-medium text-slate-900">{item.value}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   14) التذييل
   ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="rounded-t-[40px] bg-slate-900 pt-16 pb-10 sm:rounded-t-[50px] md:rounded-t-[60px]">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo tone="light" size="lg" />
            <p className="mt-6 max-w-sm text-[15px] leading-[1.95] text-white/60">{SITE.footerLine}</p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/40">روابط</h3>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => scrollToId(link.id)}
                    className="text-[14.5px] text-white/70 transition-colors duration-200 hover:text-[#009e52]"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/40">تواصل</h3>
            <ul className="mt-5 flex flex-col gap-3 text-[14.5px] text-white/70">
              <li>جدة، المملكة العربية السعودية</li>
              <li>
                <button
                  type="button"
                  dir="ltr"
                  onClick={() => openExternal(waLink(CONTACT.waMessage))}
                  className="transition-colors duration-200 hover:text-[#009e52]"
                >
                  {CONTACT.phoneDisplay}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  dir="ltr"
                  onClick={() => openExternal(`mailto:${CONTACT.email}`)}
                  className="block max-w-full truncate transition-colors duration-200 hover:text-[#009e52]"
                >
                  {CONTACT.email}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6">
          <p className="text-center text-[13px] text-white/40" dir="rtl">
            © {SITE.nameEn} — جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** زر واتساب عائم — يظهر على الموبايل */
function FloatingWhatsApp() {
  return (
    <button
      type="button"
      onClick={() => openExternal(waLink(CONTACT.waMessage))}
      aria-label="تواصل معنا عبر واتساب"
      className="fixed bottom-5 left-5 z-[65] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_14px_36px_-12px_rgba(0,158,82,0.8)] transition-transform duration-200 hover:scale-105 lg:hidden"
      style={{ backgroundColor: C.green2 }}
    >
      <MessageCircle size={24} />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   15) الجذر
   ──────────────────────────────────────────────────────────────── */

export default function TalansGroupSite() {
  useThmanyahFont();
  const [activeForm, setActiveForm] = useState(null);

  const openForm = useCallback((key) => setActiveForm(key), []);
  const closeForm = useCallback(() => setActiveForm(null), []);

  return (
    <div dir="rtl" lang="ar" className="talans-app min-h-screen w-full bg-white antialiased">
      <Navbar />

      <main>
        <HeroSection />
        <MarqueeSection />
        <AboutSection />
        <SectorsSection />
        <InvestmentSection />
        <ServicesSection />
        <ProjectsSection />
        <OpportunitiesSection onOpen={openForm} />
        <ContactSection />
      </main>

      <Footer />
      <FloatingWhatsApp />

      <AnimatePresence>
        {activeForm && <FormModal key={activeForm} form={FORMS[activeForm]} onClose={closeForm} />}
      </AnimatePresence>
    </div>
  );
}
