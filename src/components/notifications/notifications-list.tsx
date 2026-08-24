"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { markNotificationReadAction } from "@/server/notifications/actions";
import { formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, string> = {
  PAYMENT_RECEIVED: "💰",
  PAYMENT_REQUEST_CREATED: "📩",
  PAYMENT_REQUEST_DUE: "⏰",
  PAYMENT_REQUEST_OVERDUE: "⚠️",
  EXPENSE_ADDED: "🧾",
  EXPENSE_UPDATED: "✏️",
  GROUP_INVITE: "👥",
  GROUP_MEMBER_JOINED: "🙋",
  SHARED_PAYMENT_PROGRESS: "📈",
  SHARED_PAYMENT_COMPLETED: "🎉",
  SHARED_PAYMENT_EXPIRED: "⌛",
  SETTLEMENT_RECORDED: "🤝",
  REFUND_ISSUED: "↩️",
  SYSTEM: "🐱",
};

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  data: Record<string, string> | null;
}

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onClick(n: NotificationRow) {
    if (!n.isRead) {
      startTransition(async () => {
        await markNotificationReadAction(n.id);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <Card
          key={n.id}
          onClick={() => onClick(n)}
          className={cn(
            "flex cursor-pointer items-start gap-3 p-3.5 transition-colors",
            !n.isRead && "border-primary-200 bg-primary-50",
          )}
        >
          <span className="text-xl">{TYPE_ICON[n.type] ?? "🔔"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
          </div>
          {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </Card>
      ))}
    </div>
  );
}
