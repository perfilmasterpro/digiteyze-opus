import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * FilterBar — container padronizado para busca + filtros + ações no topo de listas.
 * Uso: <FilterBar><SearchInput/> <Select/> <Button/></FilterBar>
 */
export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
