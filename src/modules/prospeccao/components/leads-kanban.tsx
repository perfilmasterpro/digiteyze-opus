import { CalendarClock, DollarSign, Flame, MapPin, MoreVertical, User } from "lucide-react";

import { KanbanBoard, type KanbanColumn } from "@/components/common/kanban-board";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  LEAD_ORIGEM_LABEL,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_LABEL,
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

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type Props = {
  leads: Lead[];
  onSelect?: (lead: Lead) => void;
  onChangeStatus?: (lead: Lead, status: LeadStatus) => void;
  canMove?: boolean;
};

export function LeadsKanban({ leads, onSelect, onChangeStatus, canMove }: Props) {
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
      renderCard={(lead) => {
        const idx = LEAD_STATUS.indexOf(lead.status);
        const prev = idx > 0 ? LEAD_STATUS[idx - 1] : undefined;
        const next = idx < LEAD_STATUS.length - 1 ? LEAD_STATUS[idx + 1] : undefined;
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelect?.(lead)}
                className="min-w-0 flex-1 text-left text-sm font-medium leading-tight text-foreground hover:underline"
              >
                {lead.nome_empresa}
              </button>
              {canMove && onChangeStatus ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-1 -mt-1 h-7 w-7 text-muted-foreground"
                      aria-label="Ações do lead"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mover estágio</DropdownMenuLabel>
                    <DropdownMenuItem
                      disabled={!next}
                      onSelect={() => next && onChangeStatus(lead, next)}
                    >
                      Avançar {next ? `→ ${LEAD_STATUS_LABEL[next]}` : ""}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!prev}
                      onSelect={() => prev && onChangeStatus(lead, prev)}
                    >
                      Voltar {prev ? `→ ${LEAD_STATUS_LABEL[prev]}` : ""}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Escolher estágio
                    </DropdownMenuLabel>
                    {LEAD_STATUS.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        disabled={s === lead.status}
                        onSelect={() => onChangeStatus(lead, s)}
                        className={s === lead.status ? "font-medium" : ""}
                      >
                        {LEAD_STATUS_LABEL[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
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
              {lead.temperatura ? (
                <span className="inline-flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {LEAD_TEMPERATURA_LABEL[lead.temperatura]}
                </span>
              ) : null}
              {typeof lead.valor_potencial === "number" ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <DollarSign className="h-3 w-3" />
                  {currency.format(lead.valor_potencial)}
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
          </div>
        );
      }}
    />
  );
}
