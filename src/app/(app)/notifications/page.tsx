import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

export const metadata: Metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="ما عندك إشعارات حاليًا" description="بنعلمك بكل جديد يخص مصاريفك ومطالباتك." />
      ) : (
        <NotificationsList
          notifications={notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            isRead: n.isRead,
            createdAt: n.createdAt,
            data: n.data as Record<string, string> | null,
          }))}
        />
      )}
    </div>
  );
}
