import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe, LayoutGrid, List, Plus, Target, Upload } from "lucide-react";
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
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_LABEL,
  LEAD_TEMPERATURAS,
  LeadFormDrawer,
  LeadImportDialog,
  LeadsTable,
  OpenPlacesDialog,
  UFS,
  useLeads,
  type Lead,
  type LeadOrigem,
  type LeadStatus,
  type LeadTemperatura,
  type UF,
} from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/lista")({
  head: () => ({
    meta: [
      { title: "Prospecção — Lista — Growth OS" },
      { name: "description", content: "Lista tabular de leads da Digiteyze." },
    ],
  }),
  component: ProspeccaoListaPage,
});

function ProspeccaoListaPage() {
  const role = useCurrentRole();
  const canView = can(role, "prospeccao:view");
  const canCreate = can(role, "prospeccao:create");
  const canImport = can(role, "growth:prospection:import");
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useLeads();

  const [search, setSearch] = useState("");
  const [origem, setOrigem] = useState<LeadOrigem | "todos">("todos");
  const [status, setStatus] = useState<LeadStatus | "todos">("todos");
  const [uf, setUf] = useState<UF | "todos">("todos");
  const [cidade, setCidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [temperatura, setTemperatura] = useState<LeadTemperatura | "todos">("todos");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [openDataOpen, setOpenDataOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const cid = cidade.trim().toLowerCase();
    const resp = responsavel.trim().toLowerCase();
    return (data ?? []).filter((l) => {
      if (origem !== "todos" && l.origem !== origem) return false;
      if (status !== "todos" && l.status !== status) return false;
      if (uf !== "todos" && l.estado !== uf) return false;
      if (temperatura !== "todos" && l.temperatura !== temperatura) return false;
      if (cid && !(l.cidade?.toLowerCase().includes(cid) ?? false)) return false;
      if (resp && !l.responsavel.toLowerCase().includes(resp)) return false;
      if (!term) return true;
      return (
        l.nome_empresa.toLowerCase().includes(term) ||
        (l.contato_nome?.toLowerCase().includes(term) ?? false) ||
        (l.contato_email?.toLowerCase().includes(term) ?? false) ||
        (l.telefone?.toLowerCase().includes(term) ?? false) ||
        (l.whatsapp?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [data, search, origem, status, uf, cidade, responsavel, temperatura]);

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <ErrorState title="Sem permissão" description="Você não tem acesso ao módulo Prospecção." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Prospecção — Lista"
        description="Visão tabular do banco de leads com filtros e busca avançada."
        icon={<Target className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate({ to: "/prospeccao" })}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button variant="secondary" size="sm" className="gap-2" disabled>
              <List className="h-4 w-4" />
              Lista
            </Button>
            {canImport ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Importar leads
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
            {canCreate ? (
              <Button size="sm" className="gap-2" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo lead
              </Button>
            ) : null}
          </div>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Buscar empresa, contato, telefone, e-mail…"
          containerClassName="w-full sm:w-80"
        />
        <Select value={origem} onValueChange={(v) => setOrigem(v as typeof origem)}>
          <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as origens</SelectItem>
            {(Object.keys(LEAD_ORIGEM_LABEL) as LeadOrigem[]).map((o) => (
              <SelectItem key={o} value={o}>{LEAD_ORIGEM_LABEL[o]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={uf} onValueChange={(v) => setUf(v as typeof uf)}>
          <SelectTrigger className="h-9 w-full sm:w-24"><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">UF</SelectItem>
            {UFS.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchInput
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          onClear={() => setCidade("")}
          placeholder="Cidade"
          containerClassName="w-full sm:w-40"
        />
        <Select value={temperatura} onValueChange={(v) => setTemperatura(v as typeof temperatura)}>
          <SelectTrigger className="h-9 w-full sm:w-36"><SelectValue placeholder="Temperatura" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {LEAD_TEMPERATURAS.map((t) => (
              <SelectItem key={t} value={t}>{LEAD_TEMPERATURA_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchInput
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          onClear={() => setResponsavel("")}
          placeholder="Responsável"
          containerClassName="w-full sm:w-44"
        />
      </FilterBar>

      {isLoading ? (
        <LoadingState label="Carregando leads…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhum lead cadastrado"
          description="Cadastre ou importe leads para começar."
          action={
            canCreate ? (
              <Button size="sm" className="gap-2" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4" /> Novo lead
              </Button>
            ) : undefined
          }
        />
      ) : (
        <LeadsTable
          leads={filtered}
          onSelect={(l) => navigate({ to: "/prospeccao/$id", params: { id: l.id } })}
        />
      )}

      <LeadFormDrawer
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setEditing(null);
        }}
        lead={editing}
      />
      <LeadImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <OpenPlacesDialog open={openDataOpen} onOpenChange={setOpenDataOpen} />
    </div>
  );
}
