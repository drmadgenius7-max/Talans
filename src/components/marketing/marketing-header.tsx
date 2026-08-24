"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/how-it-works", label: "كيف تعمل قِطّة؟" },
  { href: "/features", label: "المزايا" },
  { href: "/help", label: "الأسئلة الشائعة" },
  { href: "/about", label: "عن قِطّة" },
  { href: "/contact", label: "تواصل معنا" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="text-2xl font-black text-primary-700">
          قِطّة
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">دخول</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">ابدأ قِطّتك</Link>
          </Button>
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary md:hidden" aria-label="القائمة">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>القائمة</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 font-medium hover:bg-secondary">
                {l.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
