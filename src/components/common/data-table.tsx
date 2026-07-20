import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Rows3 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { EmptyState } from "./empty-state";
import { TableSkeleton } from "./loading-state";

export type DataTableDensity = "comfortable" | "compact";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
  className?: string;
  /** Habilita ordenação por esta coluna. */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
  /** Rótulo usado no menu de colunas configuráveis. */
  label?: string;
  /** Coluna sempre visível (não aparece no toggle). */
  alwaysVisible?: boolean;
  /** Estado inicial de visibilidade. */
  defaultHidden?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Seleção múltipla controlada externamente. */
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Paginação. */
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Habilita controles de densidade e visibilidade de colunas. */
  showToolbar?: boolean;
  /**
   * Chave estável cuja mudança reseta a paginação para a primeira página.
   * Use uma string derivada dos filtros/busca externos (ex.: `${search}|${tipo}|${status}`).
   */
  resetPageKey?: string;
};

type SortState = { key: string; direction: "asc" | "desc" } | null;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyTitle = "Nada por aqui",
  emptyDescription = "Nenhum registro encontrado.",
  emptyAction,
  onRowClick,
  className,
  selectable,
  selected,
  onSelectionChange,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  showToolbar = true,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [density, setDensity] = useState<DataTableDensity>("comfortable");
  const [hidden, setHidden] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach((c) => {
      if (c.defaultHidden) initial[c.key] = true;
    });
    return initial;
  });

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hidden[c.key]),
    [columns, hidden],
  );

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortAccessor) return data;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = col.sortAccessor!(a);
      const bv = col.sortAccessor!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [data, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [sorted, currentPage, pageSize],
  );

  const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);
  const pageIds = pageRows.map(rowKey);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someOnPageSelected = pageIds.some((id) => selectedSet.has(id)) && !allOnPageSelected;

  function toggleAllOnPage(checked: boolean) {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (checked) pageIds.forEach((id) => next.add(id));
    else pageIds.forEach((id) => next.delete(id));
    onSelectionChange(Array.from(next));
  }

  function toggleRow(id: string, checked: boolean) {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(Array.from(next));
  }

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  const cellPadding = density === "compact" ? "py-1.5" : "py-3";

  if (loading) return <TableSkeleton />;

  return (
    <div className={cn("space-y-3", className)}>
      {showToolbar ? (
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Rows3 className="h-4 w-4" />
                Densidade
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Densidade da tabela</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={density}
                onValueChange={(v) => setDensity(v as DataTableDensity)}
              >
                <DropdownMenuRadioItem value="comfortable">Confortável</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="compact">Compacta</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns3 className="h-4 w-4" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => !c.alwaysVisible)
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden[c.key]}
                    onCheckedChange={(checked) =>
                      setHidden((prev) => ({ ...prev, [c.key]: !checked }))
                    }
                  >
                    {c.label ?? (typeof c.header === "string" ? c.header : c.key)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectable ? (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleAllOnPage(v === true)}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                  ) : null}
                  {visibleColumns.map((c) => {
                    const sortable = Boolean(c.sortAccessor);
                    const active = sort?.key === c.key;
                    return (
                      <TableHead
                        key={c.key}
                        style={c.width ? { width: c.width } : undefined}
                        className={cn(
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                          c.className,
                        )}
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                          >
                            {c.header}
                            {active ? (
                              sort!.direction === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                            )}
                          </button>
                        ) : (
                          c.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const id = rowKey(row);
                  const isSelected = selectedSet.has(id);
                  return (
                    <TableRow
                      key={id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={onRowClick ? "cursor-pointer" : undefined}
                    >
                      {selectable ? (
                        <TableCell
                          className={cellPadding}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) => toggleRow(id, v === true)}
                            aria-label="Selecionar linha"
                          />
                        </TableCell>
                      ) : null}
                      {visibleColumns.map((c) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            cellPadding,
                            c.align === "right" && "text-right",
                            c.align === "center" && "text-center",
                            c.className,
                          )}
                        >
                          {c.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Linhas por página</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2">
                    {pageSize}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(0);
                    }}
                  >
                    {pageSizeOptions.map((n) => (
                      <DropdownMenuRadioItem key={n} value={String(n)}>
                        {n}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <span>
                {sorted.length === 0
                  ? "0 registros"
                  : `${currentPage * pageSize + 1}–${Math.min(sorted.length, (currentPage + 1) * pageSize)} de ${sorted.length}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>
                Página {currentPage + 1} de {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
