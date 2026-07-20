import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KanbanColumn<T> = {
  id: string;
  title: string;
  items: T[];
  accent?: "primary" | "info" | "warning" | "success" | "destructive" | "neutral";
};

type KanbanBoardProps<T> = {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  itemKey: (item: T) => string;
  className?: string;
};

const ACCENT: Record<NonNullable<KanbanColumn<unknown>["accent"]>, string> = {
  primary: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground",
};

/**
 * KanbanBoard — estrutura visual (sem drag-and-drop nesta fase).
 * DnD será adicionado quando os módulos de negócio o exigirem.
 */
export function KanbanBoard<T>({ columns, renderCard, itemKey, className }: KanbanBoardProps<T>) {
  return (
    <div className={cn("grid gap-4 overflow-x-auto pb-2", className)}
         style={{ gridAutoFlow: "column", gridAutoColumns: "minmax(260px, 1fr)" }}>
      {columns.map((col) => (
        <div key={col.id} className="flex min-w-0 flex-col rounded-lg border bg-muted/30 p-3">
          <div className="mb-3 flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", ACCENT[col.accent ?? "neutral"])} />
            <h4 className="truncate text-sm font-semibold">{col.title}</h4>
            <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
              {col.items.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {col.items.map((item) => (
              <Card key={itemKey(item)} className="p-3 shadow-sm">
                {renderCard(item)}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
