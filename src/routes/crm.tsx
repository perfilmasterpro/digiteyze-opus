import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Contact, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { FilterBar } from "@/components/common/filter-bar";
import { KpiCard } from "@/components/common/kpi-card";
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
import { useEmpresas } from "@/modules/empresas";
import {
  OPPORTUNITY_ORIGEM_LABEL,
  OPPORTUNITY_ORIGENS,
  OpportunitiesKanban,
  OpportunityFormDrawer,
  computeOpportunityKpis,
  useOpportunities,
  useUpdateOpportunityStatus,
  type Opportunity,
  type OpportunityOrigem,
  type OpportunityStatus,
} from "@/modules/crm";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

export const Route = createFileRoute("/crm")({
  head: () => ({
    meta: [
      { title: "CRM — Growth OS" },
      {
        name: "description",
        content: "Pipeline comercial de oportunidades do Growth OS.",
      },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  const role = useCurrentRole();
  const navigate = useNavigate();
  const canView = can(role, "crm:view");
  const canCreate = can(role, "crm:create");
  const canMove = can(role, "crm:move");

  const { data, isLoading, isError, refetch } = useOpportunities();
  const { data: empresas } = useEmpresas();
  const empresaById = useMemo(
    () => new Map((empresas ?? []).map((e) => [e.id, e.nome] as const)),
    [empresas],
  );
  const updateStatus = useUpdateOpportunityStatus();

  const [search, setSearch] = useState("");
  const [origemFilter, setOrigemFilter] = useState<OpportunityOrigem | "todas">("todas");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (origemFilter !== "todas" && o.origem !== origemFilter) return false;
      if (!term) return true;
      const empresaNome = empresaById.get(o.empresa_id)?.toLowerCase() ?? "";
      return (
        o.nome.toLowerCase().includes(term) ||
        empresaNome.includes(term) ||
        (o.responsavel_nome?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [data, search, origemFilter, empresaById]);

  const kpis = useMemo(() => computeOpportunityKpis(filtered), [filtered]);

  function openCreate() {
    setDrawerOpen(true);
  }
  function openDetail(opp: Opportunity) {
    navigate({ to: "/crm/$id", params: { id: opp.id } });
  }

  async function handleChangeStatus(opp: Opportunity, status: OpportunityStatus) {
    try {
      await updateStatus.mutateAsync({
        id: opp.id,
        status,
        previousStatus: opp.status,
      });
      toast.success("Estágio atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mover.");
    }
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <ErrorState title="Sem permissão" description="Você não tem acesso ao módulo CRM." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="CRM Comercial"
        description="Pipeline de oportunidades — do lead qualificado ao fechamento."
        icon={<Contact className="h-5 w-5" />}
        actions={
          canCreate ? (
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova oportunidade
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pipeline total" value={currency.format(kpis.pipelineTotal)} hint={`${kpis.quantidade} oportunidades`} />
        <KpiCard label="Valor ganho" value={currency.format(kpis.valorGanho)} hint={`${kpis.ganhos} ganhas`} />
        <KpiCard label="Valor perdido" value={currency.format(kpis.valorPerdido)} hint={`${kpis.perdas} perdidas`} />
        <KpiCard label="Taxa de conversão" value={percent.format(kpis.taxaConversao)} hint="Ganho / (Ganho + Perdido)" />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Buscar por oportunidade, empresa ou responsável…"
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
            <SelectItem value="todas">Todas as origens</SelectItem>
            {OPPORTUNITY_ORIGENS.map((o) => (
              <SelectItem key={o} value={o}>
                {OPPORTUNITY_ORIGEM_LABEL[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? (
        <LoadingState label="Carregando oportunidades…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhuma oportunidade cadastrada"
          description="Crie a primeira oportunidade para iniciar o pipeline comercial."
          action={
            canCreate ? (
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Nova oportunidade
              </Button>
            ) : undefined
          }
        />
      ) : (
        <OpportunitiesKanban
          opportunities={filtered}
          onSelect={openDetail}
          canMove={canMove}
          onChangeStatus={handleChangeStatus}
        />
      )}

      <OpportunityFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        opportunity={null}
      />
    </div>
  );
}
