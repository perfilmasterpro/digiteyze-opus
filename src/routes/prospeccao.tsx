import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  LEAD_ORIGEM_LABEL,
  LeadFormDrawer,
  LeadsKanban,
  useLeads,
  type Lead,
  type LeadOrigem,
} from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao")({
  head: () => ({
    meta: [
      { title: "Prospecção — Growth OS" },
      { name: "description", content: "Pipeline operacional de leads da Digiteyze." },
    ],
  }),
  component: ProspeccaoPage,
});

function ProspeccaoPage() {
  const role = useCurrentRole();
  const canView = can(role, "prospeccao:view");
  const canCreate = can(role, "prospeccao:create");
  const canUpdate = can(role, "prospeccao:update");

  const { data, isLoading, isError, refetch } = useLeads();

  const [search, setSearch] = useState("");
  const [origemFilter, setOrigemFilter] = useState<LeadOrigem | "todos">("todos");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((l) => {
      if (origemFilter !== "todos" && l.origem !== origemFilter) return false;
      if (!term) return true;
      return (
        l.nome_empresa.toLowerCase().includes(term) ||
        l.responsavel.toLowerCase().includes(term) ||
        (l.cidade?.toLowerCase().includes(term) ?? false) ||
        (l.whatsapp?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [data, search, origemFilter]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(lead: Lead) {
    if (!canUpdate) return;
    setEditing(lead);
    setDrawerOpen(true);
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <ErrorState
          title="Sem permissão"
          description="Você não tem acesso ao módulo Prospecção."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Prospecção"
        description="Pipeline visual de leads — do primeiro contato ao fechamento."
        icon={<Target className="h-5 w-5" />}
        actions={
          canCreate ? (
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Novo lead
            </Button>
          ) : null
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Buscar por empresa, responsável, cidade ou WhatsApp…"
          containerClassName="w-full sm:w-96"
        />
        <Select
          value={origemFilter}
          onValueChange={(v) => setOrigemFilter(v as typeof origemFilter)}
        >
          <SelectTrigger className="h-9 w-full sm:w-48">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as origens</SelectItem>
            {(Object.keys(LEAD_ORIGEM_LABEL) as LeadOrigem[]).map((o) => (
              <SelectItem key={o} value={o}>
                {LEAD_ORIGEM_LABEL[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? (
        <LoadingState label="Carregando leads…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum lead cadastrado"
          description="Cadastre o primeiro lead para iniciar o pipeline."
          action={
            canCreate ? (
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Novo lead
              </Button>
            ) : undefined
          }
        />
      ) : (
        <LeadsKanban leads={filtered} onSelect={openEdit} />
      )}

      <LeadFormDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditing(null);
        }}
        lead={editing}
      />
    </div>
  );
}
