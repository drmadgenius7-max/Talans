"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { bottomNavItems } from "./nav-items";

export function BottomNav({ onCreateClick }: { onCreateClick: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="grid grid-cols-5 items-center">
        {bottomNavItems.map((item) => {
          if (item.href === "__create__") {
            return (
              <button
                key={item.href}
                onClick={onCreateClick}
                className="flex flex-col items-center gap-0.5 py-2.5"
                aria-label="إنشاء"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md -mt-4">
                  <item.icon className="h-6 w-6" />
                </span>
              </button>
            );
          }
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "fill-primary-100")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
