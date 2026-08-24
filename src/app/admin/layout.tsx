import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { ShieldAlert } from "lucide-react";

const links = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/groups", label: "المجموعات" },
  { href: "/admin/payment-requests", label: "المطالبات" },
  { href: "/admin/shared-payments", label: "الدفع التشاركي" },
  { href: "/admin/transactions", label: "المعاملات" },
  { href: "/admin/refunds", label: "الاستردادات" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-secondary/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-black text-primary-700">
            <ShieldAlert className="h-5 w-5" /> لوحة تحكم قِطّة
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            الرجوع للتطبيق
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="shrink-0 rounded-lg px-3 py-1.5 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
