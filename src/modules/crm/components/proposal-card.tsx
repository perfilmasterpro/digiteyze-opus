import { CalendarClock, FileText, Percent } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { ProposalStatusBadge } from "./proposal-status-badge";
import type { Proposal } from "../types/proposals.types";

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
 * Cartão compacto de proposta — usado em listas dentro da oportunidade
 * ou em resumos da Empresa 360°.
 */
export function ProposalCard({
  proposal,
  onOpen,
  actions,
}: {
  proposal: Proposal;
  onOpen?: (p: Proposal) => void;
  actions?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <button
            type="button"
            onClick={() => onOpen?.(proposal)}
            className="flex items-center gap-2 text-left text-sm font-medium text-foreground hover:underline"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            {proposal.titulo}
          </button>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <ProposalStatusBadge status={proposal.status} />
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Envio: {fmt(proposal.data_envio)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Validade: {proposal.validade_dias}d
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-base font-semibold text-foreground">
            {currency.format(proposal.valor_total || 0)}
          </span>
          {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
