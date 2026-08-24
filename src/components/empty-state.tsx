import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-14 text-center", className)}>
      {Icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          <Icon className="h-7 w-7" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="font-bold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground max-w-xs">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
