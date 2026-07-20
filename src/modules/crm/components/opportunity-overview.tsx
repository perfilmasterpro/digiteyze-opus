import { CalendarClock, Percent, User } from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { computeProposalKpis, useProposalsByOpportunity } from "../hooks/use-proposals";
import {
  OPPORTUNITY_ORIGEM_LABEL,
  OPPORTUNITY_STATUS_LABEL,
  type Opportunity,
} from "../types/opportunities.types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function OpportunityOverview({ opportunity }: { opportunity: Opportunity }) {
  const { data: proposals } = useProposalsByOpportunity(opportunity.id);
  const kpis = computeProposalKpis(proposals ?? []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Valor estimado"
          value={currency.format(opportunity.valor_estimado || 0)}
          hint={OPPORTUNITY_STATUS_LABEL[opportunity.status]}
        />
        <KpiCard
          label="Propostas"
          value={String(kpis.total)}
          hint={`${kpis.quantidadeAprovadas} aprovadas`}
        />
        <KpiCard
          label="Em negociação"
          value={currency.format(kpis.valorEmNegociacao)}
          hint="Rascunho + Enviadas"
        />
        <KpiCard
          label="Valor aprovado"
          value={currency.format(kpis.valorAprovado)}
          hint={`${kpis.quantidadeRecusadas} recusadas`}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes da oportunidade</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Origem" value={OPPORTUNITY_ORIGEM_LABEL[opportunity.origem]} />
            <Field
              label="Probabilidade"
              value={
                <span className="inline-flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  {opportunity.probabilidade}%
                </span>
              }
            />
            <Field
              label="Fechamento previsto"
              value={
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {fmt(opportunity.data_fechamento_prevista)}
                </span>
              }
            />
            {opportunity.responsavel_nome ? (
              <Field
                label="Responsável"
                value={
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {opportunity.responsavel_nome}
                  </span>
                }
              />
            ) : null}
            <Field label="Criada em" value={fmt(opportunity.created_at)} />
            <Field label="Atualizada em" value={fmt(opportunity.updated_at)} />
          </dl>
          {opportunity.observacoes ? (
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-line">
              {opportunity.observacoes}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}
