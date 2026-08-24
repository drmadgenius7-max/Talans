"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Users2, Receipt, UserPlus, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const actions = [
  {
    key: "paid_for_them",
    title: "دفعت عنهم",
    description: "دفعت فاتورة وتبي تسترد حصص أصحابك",
    icon: HandCoins,
    href: "/expenses/new?mode=paid_for_them",
  },
  {
    key: "shared_payment",
    title: "دفع تشاركي",
    description: "نجمع المبلغ قبل ما نشتري شيء مع بعض",
    icon: Sparkles,
    href: "/shared-payments/new",
  },
  {
    key: "expense",
    title: "إضافة مصروف",
    description: "سجّل مصروف وقسّمه على المجموعة",
    icon: Receipt,
    href: "/expenses/new?mode=general",
  },
  {
    key: "request",
    title: "مطالبة شخص",
    description: "أرسل طلب دفع مباشر لأي شخص",
    icon: UserPlus,
    href: "/payment-requests/new",
  },
  {
    key: "group",
    title: "إنشاء مجموعة",
    description: "رحلة، سكن، مناسبة، أو أي شيء تحب",
    icon: Users2,
    href: "/groups/new",
  },
];

export function CreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>وش تبي تسوي؟</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => go(action.href)}
              className="flex items-center gap-4 rounded-2xl border border-border p-4 text-start transition-colors hover:border-primary-300 hover:bg-primary-50 active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-bold">{action.title}</span>
                <span className="block text-xs text-muted-foreground">{action.description}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function useCreateSheet() {
  return useState(false);
}
