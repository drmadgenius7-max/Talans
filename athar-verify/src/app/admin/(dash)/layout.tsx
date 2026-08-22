import Link from 'next/link';
import {
  FileVideo,
  LayoutDashboard,
  PackageSearch,
  ShieldCheck,
} from 'lucide-react';
import { AtharMark } from '@/components/brand';
import { LogoutButton } from '@/components/admin/logout-button';
import { requirePageUser } from '@/lib/auth/guard';
import { ROLE_AR } from '@/lib/i18n/countries';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'الطلبات', icon: PackageSearch },
  { href: '/admin/documentation', label: 'التوثيقات', icon: FileVideo },
  { href: '/admin/verifications', label: 'عمليات التحقق', icon: ShieldCheck },
];

/**
 * Admin shell.
 *
 * The guard lives in the layout so every page under it is protected by
 * construction — adding a new admin page cannot accidentally ship unauthorised.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser('VIEWER');

  return (
    <div className="flex min-h-dvh flex-col bg-secondary/30">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2.5 text-primary">
            <AtharMark className="size-8" />
            <span className="text-sm font-bold text-foreground">لوحة أثر للتحقق</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {ROLE_AR[user.role] ?? user.role}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>

        <nav className="container flex gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="container flex-1 py-7">{children}</main>
    </div>
  );
}
