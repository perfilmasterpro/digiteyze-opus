import { Link } from "@tanstack/react-router";
import { CalendarClock, Eye, FileText } from "lucide-react";
import { toast } from "sonner";

import { KpiCard } from "@/components/common/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ProposalStatusBadge } from "./proposal-status-badge";
import {
  computeProposalKpis,
  useGenerateProposalPdf,
  useProposalsByEmpresa,
} from "../hooks/use-proposals";

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
  const generatePdf = useGenerateProposalPdf();
  const ultima = kpis.ultimaEnviada ?? proposals[0] ?? null;

  async function handlePreview() {
    if (!ultima) return;
    try {
      await generatePdf.mutateAsync({ proposal: ultima, mode: "preview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF.");
    }
  }

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
        ) : ultima ? (
          <div className="rounded-md border p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              {kpis.ultimaEnviada ? "Última proposta enviada" : "Última proposta gerada"}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to="/crm/$id/propostas"
                params={{ id: ultima.opportunity_id }}
                className="text-sm font-medium text-primary hover:underline"
              >
                {ultima.titulo}
              </Link>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <ProposalStatusBadge status={ultima.status} />
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {fmt(ultima.data_envio ?? ultima.updated_at)}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {currency.format(ultima.valor_total)}
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={handlePreview}
                disabled={generatePdf.isPending}
              >
                <Eye className="h-3.5 w-3.5" />
                Visualizar PDF
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma proposta comercial registrada para esta empresa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
