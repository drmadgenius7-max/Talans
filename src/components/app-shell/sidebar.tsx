"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNavItems } from "./nav-items";

export function Sidebar({ onCreateClick }: { onCreateClick: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-s border-border bg-card px-4 py-6 sm:flex">
      <Link href="/dashboard" className="mb-8 px-2 text-2xl font-black text-primary-700">
        قِطّة
      </Link>

      <button
        onClick={onCreateClick}
        className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-700"
      >
        <PlusCircle className="h-5 w-5" />
        إنشاء جديد
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {primaryNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "bg-primary-100 text-primary-800" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
