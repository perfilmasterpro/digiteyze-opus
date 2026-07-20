import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Building2, Edit, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentRole } from "@/hooks/use-current-role";
import { can } from "@/config/rbac";
import { EmpresaFormDrawer } from "@/modules/empresas/empresa-form-drawer";
import {
  EMPRESA_ORIGEM_LABEL,
  EMPRESA_STATUS_LABEL,
  EMPRESA_TIPO_LABEL,
  type Empresa,
  type EmpresaStatus,
  type EmpresaTipo,
} from "@/modules/empresas/empresas.types";
import {
  useArchiveEmpresa,
  useEmpresas,
  useReactivateEmpresa,
} from "@/modules/empresas/use-empresas";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas — Growth OS" },
      { name: "description", content: "Cadastro central de empresas do Growth OS." },
    ],
  }),
  component: EmpresasPage,
});

const STATUS_TONE: Record<EmpresaStatus, StatusTone> = {
  ativo: "success",
  inativo: "neutral",
  arquivado: "warning",
};

function EmpresasPage() {
  const role = useCurrentRole();
  const canView = can(role, "empresas:view");
  const canCreate = can(role, "empresas:create");
  const canUpdate = can(role, "empresas:update");
  const canArchive = can(role, "empresas:archive");

  const { data, isLoading, isError, refetch } = useEmpresas();
  const archive = useArchiveEmpresa();
  const reactivate = useReactivateEmpresa();

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<EmpresaTipo | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<EmpresaStatus | "todos">("todos");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [archiveTarget, setArchiveTarget] = useState<Empresa | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Empresa | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (tipoFilter !== "todos" && e.tipo !== tipoFilter) return false;
      if (statusFilter !== "todos" && e.status !== statusFilter) return false;
      if (!term) return true;
      return (
        e.nome.toLowerCase().includes(term) ||
        e.responsavel.toLowerCase().includes(term) ||
        (e.email?.toLowerCase().includes(term) ?? false) ||
        (e.documento?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [data, search, tipoFilter, statusFilter]);

  const columns: DataTableColumn<Empresa>[] = [
    {
      key: "nome",
      header: "Nome",
      label: "Nome",
      alwaysVisible: true,
      sortAccessor: (r) => r.nome.toLowerCase(),
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.nome}</span>
          {r.segmento ? (
            <span className="text-xs text-muted-foreground">{r.segmento}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      label: "Tipo",
      sortAccessor: (r) => r.tipo,
      cell: (r) => <span className="text-sm">{EMPRESA_TIPO_LABEL[r.tipo]}</span>,
    },
    {
      key: "status",
      header: "Status",
      label: "Status",
      sortAccessor: (r) => r.status,
      cell: (r) => (
        <StatusBadge tone={STATUS_TONE[r.status]}>{EMPRESA_STATUS_LABEL[r.status]}</StatusBadge>
      ),
    },
    {
      key: "responsavel",
      header: "Responsável",
      label: "Responsável",
      sortAccessor: (r) => r.responsavel.toLowerCase(),
      cell: (r) => <span className="text-sm">{r.responsavel}</span>,
    },
    {
      key: "origem",
      header: "Origem",
      label: "Origem",
      sortAccessor: (r) => r.origem,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{EMPRESA_ORIGEM_LABEL[r.origem]}</span>
      ),
    },
    {
      key: "cidade",
      header: "Cidade/UF",
      label: "Cidade/UF",
      defaultHidden: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {[r.cidade, r.estado].filter(Boolean).join(" / ") || "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Criada em",
      label: "Criada em",
      sortAccessor: (r) => r.created_at,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {new Date(r.created_at).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      label: "Ações",
      alwaysVisible: true,
      align: "right",
      width: "60px",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Abrir ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              disabled={!canUpdate}
              onSelect={() => {
                setEditing(r);
                setDrawerOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {r.status === "arquivado" ? (
              <DropdownMenuItem
                disabled={!canArchive}
                onSelect={() => setReactivateTarget(r)}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Reativar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!canArchive}
                onSelect={() => setArchiveTarget(r)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  async function handleReactivate() {
    if (!reactivateTarget) return;
    try {
      await reactivate.mutateAsync(reactivateTarget.id);
      toast.success("Empresa reativada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reativar");
    } finally {
      setReactivateTarget(null);
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    try {
      await archive.mutateAsync(archiveTarget.id);
      toast.success("Empresa arquivada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível arquivar");
    } finally {
      setArchiveTarget(null);
    }
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <ErrorState
          title="Sem permissão"
          description="Você não tem acesso ao módulo Empresas."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Empresas"
        description="Cadastro central de clientes, parceiros, fornecedores e prospects."
        icon={<Building2 className="h-5 w-5" />}
        actions={
          canCreate ? (
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova empresa
            </Button>
          ) : null
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Buscar por nome, responsável, e-mail ou documento…"
          containerClassName="w-full sm:w-96"
        />
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as typeof tipoFilter)}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {(Object.keys(EMPRESA_TIPO_LABEL) as EmpresaTipo[]).map((t) => (
              <SelectItem key={t} value={t}>
                {EMPRESA_TIPO_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(EMPRESA_STATUS_LABEL) as EmpresaStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {EMPRESA_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.length > 0 ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {selected.length} selecionada(s)
          </span>
        ) : null}
      </FilterBar>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          loading={isLoading}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          onRowClick={
            canUpdate
              ? (r) => {
                  setEditing(r);
                  setDrawerOpen(true);
                }
              : undefined
          }
          emptyTitle={
            (data?.length ?? 0) === 0 ? "Nenhuma empresa cadastrada" : "Nenhum resultado"
          }
          emptyDescription={
            (data?.length ?? 0) === 0
              ? "Cadastre a primeira empresa para começar a operar."
              : "Ajuste a busca ou os filtros para encontrar o que procura."
          }
          emptyAction={
            (data?.length ?? 0) === 0 && canCreate ? (
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nova empresa
              </Button>
            ) : undefined
          }
        />
      )}

      <EmpresaFormDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditing(null);
        }}
        empresa={editing}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Arquivar empresa?"
        description={
          archiveTarget
            ? `A empresa "${archiveTarget.nome}" será marcada como arquivada e sairá das listagens padrão.`
            : undefined
        }
        confirmLabel="Arquivar"
        onConfirm={handleArchive}
      />
    </div>
  );
}
