import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unreadCount = await db.notification.count({ where: { userId: user.id, isRead: false } });

  return (
    <AppShell name={user.name} avatarUrl={user.avatarUrl} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
