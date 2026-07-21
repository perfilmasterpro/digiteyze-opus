import { CalendarClock, FileSignature } from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ContractStatusBadge } from "./contract-status-badge";
import {
  computeContractKpis,
  useContractsByEmpresa,
} from "../hooks/use-contracts";

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
 * Bloco "Contratos" da Empresa 360° → aba Comercial.
 * Consome apenas hooks do módulo CRM (barrel público).
 */
export function EmpresaContractsSummary({ empresaId }: { empresaId: string }) {
  const { data, isLoading } = useContractsByEmpresa(empresaId);
  const contracts = data ?? [];
  const kpis = computeContractKpis(contracts);
  const ultimo = kpis.ultimo;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-4 w-4" />
          Contratos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Quantidade" value={String(kpis.total)} hint="Total" />
          <KpiCard label="Ativos" value={String(kpis.ativos)} hint="Em vigor" />
          <KpiCard
            label="Assinados"
            value={String(kpis.assinados)}
            hint={currency.format(kpis.valorAssinado)}
          />
          <KpiCard
            label="Cancelados"
            value={String(kpis.cancelados)}
            hint="Encerrados"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando contratos…</p>
        ) : ultimo ? (
          <div className="rounded-md border p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Último contrato
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {ultimo.titulo}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <ContractStatusBadge status={ultimo.status} />
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {fmt(ultimo.data_emissao ?? ultimo.created_at)}
                </span>
                {typeof ultimo.valor === "number" ? (
                  <span className="text-sm font-semibold text-foreground">
                    {currency.format(ultimo.valor)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{ultimo.numero}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum contrato registrado para esta empresa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
