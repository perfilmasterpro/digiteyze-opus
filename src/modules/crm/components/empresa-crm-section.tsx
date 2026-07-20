import { Link } from "@tanstack/react-router";
import { CalendarClock, Handshake, Percent, Plus, Trophy, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";

import { OpportunityFormDrawer } from "./opportunity-form-drawer";
import {
  computeOpportunityKpis,
  useOpportunitiesByEmpresa,
  useUpdateOpportunityStatus,
} from "../hooks/use-opportunities";
import {
  OPPORTUNITY_OPEN_STATUSES,
  OPPORTUNITY_STATUS_LABEL,
  type Opportunity,
  type OpportunityStatus,
} from "../types/opportunities.types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<OpportunityStatus, StatusTone> = {
  aberto: "neutral",
  qualificado: "info",
  proposta: "primary",
  negociacao: "warning",
  ganho: "success",
  perdido: "destructive",
};

/**
 * Seção CRM da aba Comercial da Empresa 360°.
 *
 * Renderizada pela rota `/empresas/$id/comercial` (nunca importada pelo
 * módulo Empresas — evita dependência circular Empresas ↔ CRM).
 */
export function EmpresaCrmSection({ empresaId }: { empresaId: string }) {
  const role = useCurrentRole();
  const canCreate = can(role, "crm:create");
  const canMove = can(role, "crm:move");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const { data, isLoading } = useOpportunitiesByEmpresa(empresaId);
  const updateStatus = useUpdateOpportunityStatus();

  const opps = data ?? [];
  const abertas = opps.filter((o) => OPPORTUNITY_OPEN_STATUSES.includes(o.status));
  const ganhas = opps.filter((o) => o.status === "ganho");
  const perdidas = opps.filter((o) => o.status === "perdido");
  const kpis = computeOpportunityKpis(opps);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(o: Opportunity) {
    setEditing(o);
    setDrawerOpen(true);
  }
  async function markWon(o: Opportunity) {
    try {
      await updateStatus.mutateAsync({ id: o.id, status: "ganho", previousStatus: o.status });
      toast.success("Oportunidade marcada como ganha");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar.");
    }
  }
  async function markLost(o: Opportunity) {
    try {
      await updateStatus.mutateAsync({ id: o.id, status: "perdido", previousStatus: o.status });
      toast.success("Oportunidade marcada como perdida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar.");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4" />
            Oportunidades (CRM)
          </CardTitle>
          {canCreate ? (
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nova
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Pipeline" value={currency.format(kpis.pipelineTotal)} hint={`${kpis.quantidade} opps.`} />
            <KpiCard label="Ganho" value={currency.format(kpis.valorGanho)} hint={`${kpis.ganhos} ganhas`} icon={<Trophy className="h-4 w-4" />} />
            <KpiCard label="Perdido" value={currency.format(kpis.valorPerdido)} hint={`${kpis.perdas} perdidas`} icon={<XCircle className="h-4 w-4" />} />
            <KpiCard label="Conversão" value={percent.format(kpis.taxaConversao)} hint="Ganho / fechadas" icon={<Percent className="h-4 w-4" />} />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando oportunidades…</p>
          ) : opps.length === 0 ? (
            <EmptyState
              icon={<Handshake className="h-5 w-5" />}
              title="Nenhuma oportunidade"
              description="Crie a primeira oportunidade para acompanhar o pipeline desta empresa."
              action={
                canCreate ? (
                  <Button size="sm" className="gap-1.5" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Nova oportunidade
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <OppGroup title="Abertas" items={abertas} onOpen={openEdit} onWin={canMove ? markWon : undefined} onLose={canMove ? markLost : undefined} to="/crm" />
              <OppGroup title="Ganhas" items={ganhas} onOpen={openEdit} to="/crm" />
              <OppGroup title="Perdidas" items={perdidas} onOpen={openEdit} to="/crm" />
            </div>
          )}
        </CardContent>
      </Card>

      <OpportunityFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        opportunity={editing}
        defaultEmpresaId={empresaId}
      />
    </>
  );
}

function OppGroup({
  title,
  items,
  onOpen,
  onWin,
  onLose,
  to,
}: {
  title: string;
  items: Opportunity[];
  onOpen: (o: Opportunity) => void;
  onWin?: (o: Opportunity) => void;
  onLose?: (o: Opportunity) => void;
  to: "/crm";
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Link to={to} className="text-xs text-primary hover:underline">
          Ver no CRM →
        </Link>
      </div>
      <ul className="divide-y rounded-md border">
        {items.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(o)}
                className="text-left text-sm font-medium text-foreground hover:underline"
              >
                {o.nome}
              </button>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <StatusBadge tone={STATUS_TONE[o.status]}>
                  {OPPORTUNITY_STATUS_LABEL[o.status]}
                </StatusBadge>
                <span className="inline-flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {o.probabilidade}%
                </span>
                {o.data_fechamento_prevista ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {new Date(o.data_fechamento_prevista).toLocaleDateString("pt-BR")}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {currency.format(o.valor_estimado || 0)}
              </span>
              {onWin ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => onWin(o)}
                >
                  <Trophy className="h-3 w-3" />
                  Ganhar
                </Button>
              ) : null}
              {onLose ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => onLose(o)}
                >
                  <XCircle className="h-3 w-3" />
                  Perder
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
