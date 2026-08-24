import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatRelative } from "@/lib/time";

interface ActivityRow {
  id: string;
  message: string;
  createdAt: Date;
}

export function GroupActivityFeed({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return <EmptyState icon={History} title="لا يوجد نشاط بعد" description="كل التغييرات المهمة بتظهر هنا." />;
  }

  return (
    <ol className="relative space-y-5 border-e-2 border-border pe-5">
      {activities.map((activity) => (
        <li key={activity.id} className="relative">
          <span className="absolute -end-[1.65rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm">{activity.message}</p>
          <p className="text-xs text-muted-foreground">{formatRelative(activity.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
