import { Circle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TimelineItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "destructive";
};

const TONE_DOT: Record<NonNullable<TimelineItem["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  primary: "bg-primary/10 text-primary ring-primary/30",
  success: "bg-success/10 text-success ring-success/30",
  warning: "bg-warning/15 text-warning ring-warning/40",
  destructive: "bg-destructive/10 text-destructive ring-destructive/30",
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-6 pl-6", className)}>
      <span
        aria-hidden
        className="absolute left-3 top-1 bottom-1 w-px bg-border"
      />
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={cn(
              "absolute -left-[13px] top-0.5 grid h-6 w-6 place-items-center rounded-full ring-1 ring-inset",
              TONE_DOT[item.tone ?? "neutral"],
            )}
          >
            {item.icon ?? <Circle className="h-2.5 w-2.5 fill-current" />}
          </span>
          <div className="ml-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="text-sm font-medium">{item.title}</p>
              {item.timestamp ? (
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
              ) : null}
            </div>
            {item.description ? (
              <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
