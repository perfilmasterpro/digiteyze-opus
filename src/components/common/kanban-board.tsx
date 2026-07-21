import { useEffect, useState, type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type KanbanColumn<T> = {
  id: string;
  title: string;
  items: T[];
  accent?: "primary" | "info" | "warning" | "success" | "destructive" | "neutral";
  /** Meta opcional exibida abaixo do título (ex.: total do estágio). */
  subtitle?: ReactNode;
  /** Cor CSS (var(--...)) usada na barra superior e no ponto do cabeçalho. */
  accentColor?: string;
};

/**
 * Handler abstrato de drop entre colunas.
 *
 * Preparado para futura integração com dnd-kit / HTML5 DnD. O KanbanBoard
 * apenas repassa: nenhum listener de DnD é registrado nesta fase para não
 * conflitar com controles internos (dropdowns, links).
 */
export type KanbanDropHandler = (itemId: string, targetColumnId: string) => void;

type KanbanBoardProps<T> = {
  columns: KanbanColumn<T>[];
  renderCard: (item: T) => ReactNode;
  itemKey: (item: T) => string;
  className?: string;
  /** Reservado — DnD será wired em sprint futuro. */
  onDropItem?: KanbanDropHandler;
};

const ACCENT: Record<NonNullable<KanbanColumn<unknown>["accent"]>, string> = {
  primary: "bg-primary",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground",
};

function ColumnHeader<T>({ col }: { col: KanbanColumn<T> }) {
  return (
    <div className="mb-3 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            col.accentColor ? undefined : ACCENT[col.accent ?? "neutral"],
          )}
          style={col.accentColor ? { backgroundColor: `var(${col.accentColor})` } : undefined}
        />
        <h4 className="truncate text-sm font-semibold">{col.title}</h4>
        <span className="ml-auto shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {col.items.length}
        </span>
      </div>
      {col.subtitle ? (
        <div className="pl-4 text-xs text-muted-foreground">{col.subtitle}</div>
      ) : null}
    </div>
  );
}

function ColumnCards<T>({
  col,
  renderCard,
  itemKey,
}: {
  col: KanbanColumn<T>;
  renderCard: (i: T) => ReactNode;
  itemKey: (i: T) => string;
}) {
  if (col.items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-background/40 px-3 py-6 text-center text-xs text-muted-foreground">
        Nenhum item neste estágio
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {col.items.map((item) => (
        <Card key={itemKey(item)} className="p-3 shadow-sm">
          {renderCard(item)}
        </Card>
      ))}
    </div>
  );
}

/**
 * KanbanBoard — estrutura visual.
 * - Desktop (md+): colunas horizontais com scroll horizontal contido.
 * - Mobile: seletor de estágio + lista full-width (evita scroll infinito).
 */
export function KanbanBoard<T>({
  columns,
  renderCard,
  itemKey,
  className,
  onDropItem,
}: KanbanBoardProps<T>) {
  // Placeholder: DnD ainda não implementado. Manter referência para o linter.
  void onDropItem;

  const [mobileColumnId, setMobileColumnId] = useState<string | undefined>(columns[0]?.id);
  useEffect(() => {
    if (!columns.some((c) => c.id === mobileColumnId)) {
      setMobileColumnId(columns[0]?.id);
    }
  }, [columns, mobileColumnId]);

  const currentMobile = columns.find((c) => c.id === mobileColumnId) ?? columns[0];

  return (
    <div className={className}>
      {/* Mobile */}
      <div className="md:hidden">
        <Select value={mobileColumnId} onValueChange={setMobileColumnId}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Selecionar estágio" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} · {c.items.length}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentMobile ? (
          <div className="mt-3 rounded-lg border bg-muted/30 p-3">
            <ColumnHeader col={currentMobile} />
            <ColumnCards col={currentMobile} renderCard={renderCard} itemKey={itemKey} />
          </div>
        ) : null}
      </div>

      {/* Desktop */}
      <div
        className="hidden gap-4 overflow-x-auto pb-2 md:grid"
        style={{ gridAutoFlow: "column", gridAutoColumns: "minmax(260px, 1fr)" }}
      >
        {columns.map((col) => (
          <div key={col.id} className="flex min-w-0 flex-col rounded-lg border bg-muted/30 p-3">
            <ColumnHeader col={col} />
            <ColumnCards col={col} renderCard={renderCard} itemKey={itemKey} />
          </div>
        ))}
      </div>
    </div>
  );
}
