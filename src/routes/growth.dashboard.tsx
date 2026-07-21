import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Handshake, Sparkles, Target, TrendingUp } from "lucide-react";
import { useMemo } from "react";

import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import {
  useOpportunities,
  useProposals,
} from "@/modules/crm";
import { useLeads } from "@/modules/prospeccao";

export const Route = createFileRoute("/growth/dashboard")({
  head: () => ({
    meta: [
      { title: "Growth — Dashboard — Growth OS" },
      { name: "description", content: "KPIs comerciais do Growth OS." },
    ],
  }),
  component: GrowthDashboardPage,
});

function isSameOrAfter(iso: string | undefined, cutoff: Date) {
  if (!iso) return false;
  return new Date(iso).getTime() >= cutoff.getTime();
}

function GrowthDashboardPage() {
  const role = useCurrentRole();
  const canView = can(role, "growth:view");
  const leadsQuery = useLeads();
  const oppsQuery = useOpportunities();
  const propsQuery = useProposals();

  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(now.getDate() - 30);

  const kpis = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    const opps = oppsQuery.data ?? [];
    const props = propsQuery.data ?? [];

    const leadsNovos = leads.filter((l) => isSameOrAfter(l.created_at, last30)).length;
    const contatosRealizados = leads.filter((l) =>
      ["primeiro_contato", "whatsapp", "respondeu", "reuniao", "proposta", "negociacao", "cliente"].includes(l.status),
    ).length;
    const reunioes = leads.filter((l) => l.status === "reuniao").length;
    const propostasEnviadas = props.filter((p) =>
      ["enviada", "visualizada", "aprovada"].includes(p.status),
    ).length;

    const clientes = leads.filter((l) => l.status === "cliente").length;
    const taxaConversao = leads.length > 0 ? (clientes / leads.length) * 100 : 0;

    const pipeline = opps
      .filter((o) => !["ganho", "perdido"].includes(o.status))
      .reduce((sum, o) => sum + (o.valor_estimado ?? 0), 0);

    return {
      leadsNovos,
      contatosRealizados,
      reunioes,
      propostasEnviadas,
      taxaConversao,
      pipeline,
    };
  }, [leadsQuery.data, oppsQuery.data, propsQuery.data, last30]);

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <ErrorState title="Sem permissão" description="Você não tem acesso ao módulo Growth." />
      </div>
    );
  }

  const loading = leadsQuery.isLoading || oppsQuery.isLoading || propsQuery.isLoading;
  const error = leadsQuery.isError || oppsQuery.isError || propsQuery.isError;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Growth — Dashboard"
        description="Visão comercial consolidada — leads, contatos, propostas e pipeline."
        icon={<Sparkles className="h-5 w-5" />}
      />

      {loading ? (
        <LoadingState label="Carregando indicadores…" />
      ) : error ? (
        <ErrorState onRetry={() => {
          leadsQuery.refetch();
          oppsQuery.refetch();
          propsQuery.refetch();
        }} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label="Leads novos (30d)"
              value={kpis.leadsNovos.toString()}
              icon={<Target className="h-4 w-4" />}
            />
            <KpiCard
              label="Contatos realizados"
              value={kpis.contatosRealizados.toString()}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Reuniões marcadas"
              value={kpis.reunioes.toString()}
              icon={<Handshake className="h-4 w-4" />}
            />
            <KpiCard
              label="Propostas enviadas"
              value={kpis.propostasEnviadas.toString()}
              icon={<FileText className="h-4 w-4" />}
            />
            <KpiCard
              label="Taxa de conversão"
              value={`${kpis.taxaConversao.toFixed(1)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              label="Pipeline financeiro"
              value={kpis.pipeline.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              })}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Atalhos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              <Link to="/prospeccao" className="text-primary hover:underline">
                Kanban de Prospecção
              </Link>
              <Link to="/prospeccao/lista" className="text-primary hover:underline">
                Lista de Leads
              </Link>
              <Link to="/crm" className="text-primary hover:underline">
                Pipeline CRM
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
