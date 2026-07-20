import { Link } from "@tanstack/react-router";
import { Building2, ChevronLeft, Edit, Percent } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/modules/empresas";

import {
  OPPORTUNITY_STATUS_LABEL,
  type Opportunity,
  type OpportunityStatus,
} from "../types/opportunities.types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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

/** Header fixo da página de detalhe da oportunidade (`/crm/$id`). */
export function OpportunityHeader({
  opportunity,
  canUpdate,
  onEdit,
}: {
  opportunity: Opportunity;
  canUpdate: boolean;
  onEdit: () => void;
}) {
  const { data: empresa } = useEmpresa(opportunity.empresa_id);

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-muted-foreground">
        <Link to="/crm">
          <ChevronLeft className="h-4 w-4" />
          CRM
        </Link>
      </Button>

      <PageHeader
        title={opportunity.nome}
        icon={<Building2 className="h-5 w-5" />}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <StatusBadge tone={STATUS_TONE[opportunity.status]}>
              {OPPORTUNITY_STATUS_LABEL[opportunity.status]}
            </StatusBadge>
            {empresa ? (
              <Link
                to="/empresas/$id"
                params={{ id: empresa.id }}
                className="font-medium text-primary hover:underline"
              >
                {empresa.nome}
              </Link>
            ) : null}
            <span aria-hidden>·</span>
            <span className="font-medium text-foreground">
              {currency.format(opportunity.valor_estimado || 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              {opportunity.probabilidade}%
            </span>
          </span>
        }
        actions={
          canUpdate ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          ) : null
        }
      />
    </div>
  );
}
