import { Link } from "@tanstack/react-router";
import { ArrowRightLeft, ChevronLeft, Edit, Flame, Target, UserRoundCog, DollarSign } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";

import {
  LEAD_ORIGEM_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_LABEL,
  type Lead,
  type LeadStatus,
} from "../types/leads.types";
import { LeadStatusMenu } from "./lead-status-menu";

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo_lead: "neutral",
  primeiro_contato: "info",
  whatsapp: "info",
  respondeu: "primary",
  reuniao: "primary",
  proposta: "warning",
  negociacao: "warning",
  cliente: "success",
  perdido: "destructive",
};

type Props = {
  lead: Lead;
  canUpdate: boolean;
  canMove: boolean;
  canConvert: boolean;
  onEdit: () => void;
  onChangeStatus: (status: LeadStatus) => void;
  onConvert: () => void;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function LeadHeader({
  lead,
  canUpdate,
  canMove,
  canConvert,
  onEdit,
  onChangeStatus,
  onConvert,
}: Props) {
  const isConverted = Boolean(lead.empresa_id);

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-muted-foreground">
        <Link to="/prospeccao">
          <ChevronLeft className="h-4 w-4" />
          Prospecção
        </Link>
      </Button>

      <PageHeader
        title={lead.nome_empresa}
        icon={<Target className="h-5 w-5" />}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <StatusBadge tone={STATUS_TONE[lead.status]}>
              {LEAD_STATUS_LABEL[lead.status]}
            </StatusBadge>
            {lead.temperatura ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                {LEAD_TEMPERATURA_LABEL[lead.temperatura]}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <UserRoundCog className="h-3.5 w-3.5" />
              {lead.responsavel}
            </span>
            <span aria-hidden>·</span>
            <span>Origem: {LEAD_ORIGEM_LABEL[lead.origem]}</span>
            {typeof lead.valor_potencial === "number" ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                {currency.format(lead.valor_potencial)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {canUpdate ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            ) : null}
            {canMove ? (
              <LeadStatusMenu
                current={lead.status}
                onChange={onChangeStatus}
                label="Alterar estágio"
              />
            ) : null}
            {canConvert && !isConverted ? (
              <Button size="sm" className="gap-2" onClick={onConvert}>
                <ArrowRightLeft className="h-4 w-4" />
                Converter em empresa
              </Button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
