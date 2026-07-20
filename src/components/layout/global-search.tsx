import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Global search — placeholder (Fase 0).
 * Futuramente abrirá um Command Palette com busca em todos os módulos.
 */
export function GlobalSearch() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 w-full justify-start gap-2 rounded-lg bg-background/60 text-muted-foreground sm:w-72"
      onClick={() => {
        // TODO: abrir command palette
      }}
    >
      <Search className="h-4 w-4" />
      <span className="truncate">Buscar em tudo…</span>
      <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
        ⌘K
      </kbd>
    </Button>
  );
}
