import { CalendarClock, MapPin, User } from "lucide-react";

import { KanbanBoard, type KanbanColumn } from "@/components/common/kanban-board";

import {
  LEAD_ORIGEM_LABEL,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  type Lead,
  type LeadStatus,
} from "../types/leads.types";

const STATUS_ACCENT: Record<LeadStatus, KanbanColumn<Lead>["accent"]> = {
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
  leads: Lead[];
  onSelect?: (lead: Lead) => void;
};

export function LeadsKanban({ leads, onSelect }: Props) {
  const columns: KanbanColumn<Lead>[] = LEAD_STATUS.map((status) => ({
    id: status,
    title: LEAD_STATUS_LABEL[status],
    accent: STATUS_ACCENT[status],
    items: leads.filter((l) => l.status === status),
  }));

  return (
    <KanbanBoard
      columns={columns}
      itemKey={(l) => l.id}
      renderCard={(lead) => (
        <button
          type="button"
          onClick={() => onSelect?.(lead)}
          className="flex w-full flex-col gap-2 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium leading-tight text-foreground">
              {lead.nome_empresa}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {lead.responsavel}
            </span>
            {lead.cidade || lead.estado ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[lead.cidade, lead.estado].filter(Boolean).join(" / ")}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground ring-1 ring-inset ring-border">
              {LEAD_ORIGEM_LABEL[lead.origem]}
            </span>
            {lead.proxima_acao ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {lead.data_proxima_acao
                  ? new Date(lead.data_proxima_acao).toLocaleDateString("pt-BR")
                  : lead.proxima_acao}
              </span>
            ) : null}
          </div>
        </button>
      )}
    />
  );
}
