import { CalendarClock, PenLine } from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SignatureStatusBadge } from "./signature-status-badge";
import {
  computeSignatureKpis,
  useSignaturesByEmpresa,
} from "../hooks/use-signatures";

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Bloco "Assinaturas" na aba Comercial da Empresa 360°.
 * Consome apenas hooks do submódulo (barrel público via `@/modules/crm`).
 */
export function EmpresaSignaturesSummary({ empresaId }: { empresaId: string }) {
  const { data, isLoading } = useSignaturesByEmpresa(empresaId);
  const signatures = data ?? [];
  const kpis = computeSignatureKpis(signatures);
  const ultima = kpis.ultimaAssinada;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="h-4 w-4" />
          Assinaturas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total" value={String(kpis.total)} hint="Solicitadas" />
          <KpiCard
            label="Aguardando"
            value={String(kpis.pendentes)}
            hint="Em andamento"
          />
          <KpiCard label="Assinadas" value={String(kpis.assinadas)} hint="Concluídas" />
          <KpiCard
            label="Recusadas"
            value={String(kpis.recusadas)}
            hint="Não assinadas"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando assinaturas…</p>
        ) : ultima ? (
          <div className="rounded-md border p-3">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              Último documento assinado
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {ultima.signer_name}
              </span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <SignatureStatusBadge status={ultima.status} />
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {fmt(ultima.signed_at ?? ultima.updated_at)}
                </span>
              </div>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {ultima.signer_email}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma assinatura registrada para esta empresa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
