import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe, LayoutGrid, List, Map, Plus, Target, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
  GooglePlacesDialog,
  LEAD_ORIGEM_LABEL,
  LeadFormDrawer,
  LeadImportDialog,
  LeadsKanban,
  LeadsTable,
  OpenPlacesDialog,
  useLeads,
  useUpdateLeadStatus,
  useUpdateLeadsProspeccaoStatus,
  type Lead,
  type LeadOrigem,
  type LeadStatus,
} from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/")({
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
  const canMove = can(role, "prospeccao:move");
  const canUpdate = can(role, "prospeccao:update");
  const canImport = can(role, "growth:prospection:import");
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const updateProspeccao = useUpdateLeadsProspeccaoStatus();

  const [search, setSearch] = useState("");
  const [origemFilter, setOrigemFilter] = useState<LeadOrigem | "todos">("todos");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [openDataOpen, setOpenDataOpen] = useState(false);
  const [googlePlacesOpen, setGooglePlacesOpen] = useState(false);
  const [view, setView] = useState<"prospeccao" | "banco">("prospeccao");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const pipelineLeads = useMemo(
    () => filtered.filter((lead) => lead.em_prospeccao || lead.status !== "novo_lead"),
    [filtered],
  );

  const bancoLeads = useMemo(
    () => filtered.filter((lead) => !lead.em_prospeccao && lead.status === "novo_lead"),
    [filtered],
  );

  const selectedVisibleIds = selectedIds.filter((id) =>
    bancoLeads.some((lead) => lead.id === id),
  );

  function openCreate() {
    setDrawerOpen(true);
  }

  function openLead(lead: Lead) {
    navigate({ to: "/prospeccao/$id", params: { id: lead.id } });
  }

  function changeView(next: "prospeccao" | "banco") {
    setView(next);
    setSelectedIds([]);
  }

  async function addSelectedToProspeccao() {
    if (selectedVisibleIds.length === 0) return;
    try {
      await updateProspeccao.mutateAsync({
        leadIds: selectedVisibleIds,
        emProspeccao: true,
      });
      setSelectedIds([]);
      setView("prospeccao");
      toast.success(
        `${selectedVisibleIds.length} ${selectedVisibleIds.length === 1 ? "lead adicionado" : "leads adicionados"} à prospecção`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar os leads à prospecção.",
      );
    }
  }

  async function handleChangeStatus(lead: Lead, status: LeadStatus) {
    try {
      await updateStatus.mutateAsync({ id: lead.id, status });
      toast.success("Estágio atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível mover.");
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate({ to: "/prospeccao/lista" })}
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
            {canCreate ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setGooglePlacesOpen(true)}
              >
                <Map className="h-4 w-4" />
                Buscar no Google Maps
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setOpenDataOpen(true)}
              >
                <Globe className="h-4 w-4" />
                Buscar empresas (grátis)
              </Button>
            ) : null}
            {canImport ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            ) : null}
            {canCreate ? (
              <Button size="sm" className="gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Novo lead
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant={view === "prospeccao" ? "secondary" : "outline"}
          size="sm"
          onClick={() => changeView("prospeccao")}
        >
          Em Prospecção
        </Button>
        <Button
          variant={view === "banco" ? "secondary" : "outline"}
          size="sm"
          onClick={() => changeView("banco")}
        >
          Banco de Leads
          {bancoLeads.length > 0 ? ` (${bancoLeads.length})` : ""}
        </Button>
      </div>

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
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setGooglePlacesOpen(true)}
                >
                  <Map className="h-4 w-4" />
                  Buscar no Google Maps
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" />
                  Novo lead
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : view === "banco" ? (
        bancoLeads.length === 0 ? (
          <EmptyState
            title="Banco de Leads vazio"
            description="Novos leads encontrados ou importados aparecerão aqui antes de entrarem na prospecção."
          />
        ) : (
          <>
            <LeadsTable
              leads={bancoLeads}
              onSelect={openLead}
              selectedIds={selectedVisibleIds}
              onSelectionChange={setSelectedIds}
              selectionEnabled
            />
            {selectedVisibleIds.length > 0 ? (
              <div className="sticky bottom-20 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
                <span className="text-sm font-medium">
                  {selectedVisibleIds.length}{" "}
                  {selectedVisibleIds.length === 1
                    ? "lead selecionado"
                    : "leads selecionados"}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                  >
                    Limpar seleção
                  </Button>
                  <Button
                    size="sm"
                    onClick={addSelectedToProspeccao}
                    disabled={updateProspeccao.isPending}
                  >
                    Adicionar à prospecção
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )
      ) : (
        <LeadsKanban
          leads={pipelineLeads}
          onSelect={openLead}
          canMove={canMove}
          canUpdate={canUpdate}
          onChangeStatus={handleChangeStatus}
        />
      )}

      <LeadFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        lead={null}
      />
      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <GooglePlacesDialog
        open={googlePlacesOpen}
        onOpenChange={setGooglePlacesOpen}
      />
      <OpenPlacesDialog open={openDataOpen} onOpenChange={setOpenDataOpen} />
    </div>
  );
}
