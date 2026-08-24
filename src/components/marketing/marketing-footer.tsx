import Link from "next/link";

const columns = [
  {
    title: "المنتج",
    links: [
      { href: "/how-it-works", label: "كيف تعمل قِطّة؟" },
      { href: "/features", label: "المزايا" },
      { href: "/help", label: "الأسئلة الشائعة" },
    ],
  },
  {
    title: "الشركة",
    links: [
      { href: "/about", label: "عن قِطّة" },
      { href: "/contact", label: "تواصل معنا" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { href: "/legal/terms", label: "الشروط والأحكام" },
      { href: "/legal/privacy", label: "سياسة الخصوصية" },
      { href: "/legal/payment-terms", label: "شروط الدفع" },
      { href: "/legal/refund-policy", label: "سياسة الاسترداد" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-black text-primary-700">قِطّة</p>
          <p className="mt-2 text-sm text-muted-foreground">الحسبة علينا.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-bold">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} قِطّة. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
