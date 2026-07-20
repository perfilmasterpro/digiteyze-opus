import { Link } from "@tanstack/react-router";
import { CalendarClock, FileText } from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ProposalStatusBadge } from "./proposal-status-badge";
import { computeProposalKpis, useProposalsByEmpresa } from "../hooks/use-proposals";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Bloco "Propostas comerciais" da Empresa 360° → aba Comercial.
 * Consome apenas hooks do módulo CRM (barrel público) e não conhece
 * detalhes internos do módulo Empresas além do `empresaId`.
 */
export function EmpresaProposalsSummary({ empresaId }: { empresaId: string }) {
  const { data, isLoading } = useProposalsByEmpresa(empresaId);
  const proposals = data ?? [];
  const kpis = computeProposalKpis(proposals);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Propostas comerciais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="Quantidade" value={String(kpis.total)} hint="Propostas totais" />
          <KpiCard
            label="Em negociação"
            value={currency.format(kpis.valorEmNegociacao)}
            hint="Rascunho + Enviadas"
          />
          <KpiCard
            label="Aprovado"
            value={currency.format(kpis.valorAprovado)}
            hint={`${kpis.quantidadeAprovadas} aprovadas`}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando propostas…</p>
        ) : kpis.ultimaEnviada ? (
          <div className="rounded-md border p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Última proposta enviada
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to="/crm/$id/propostas"
                params={{ id: kpis.ultimaEnviada.opportunity_id }}
                className="text-sm font-medium text-primary hover:underline"
              >
                {kpis.ultimaEnviada.titulo}
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <ProposalStatusBadge status={kpis.ultimaEnviada.status} />
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {fmt(kpis.ultimaEnviada.data_envio)}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {currency.format(kpis.ultimaEnviada.valor_total)}
                </span>
              </div>
            </div>
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma proposta comercial registrada para esta empresa.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma proposta enviada ainda — existem apenas rascunhos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
