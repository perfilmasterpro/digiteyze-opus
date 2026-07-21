import { CalendarClock, Clock, Copy, DollarSign, Globe, Instagram, MapPin, MessageCircle, MoreVertical, Phone, User } from "lucide-react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";

import {
  LEAD_ORIGEM_LABEL,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_DOT,
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
  const columns: KanbanColumn<Lead>[] = LEAD_STATUS.map((status) => {
    const items = leads.filter((l) => l.status === status);
    const total = items.reduce((sum, l) => sum + (l.valor_potencial ?? 0), 0);
    return {
      id: status,
      title: LEAD_STATUS_LABEL[status],
      accent: STATUS_ACCENT[status],
      items,
      subtitle: (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium text-foreground">{currency.format(total)}</span>
          <span aria-hidden>·</span>
          <span>
            {items.length} {items.length === 1 ? "lead" : "leads"}
          </span>
        </span>
      ),
    };
  });

  const handleDrop = (leadId: string, targetStatus: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || !onChangeStatus) return;
    if (lead.status === targetStatus) return;
    onChangeStatus(lead, targetStatus as LeadStatus);
  };

  return (
    <KanbanBoard
      columns={columns}
      itemKey={(l) => l.id}
      onDropItem={canMove ? handleDrop : undefined}
      renderCard={(lead) => {
        const idx = LEAD_STATUS.indexOf(lead.status);
        const prev = idx > 0 ? LEAD_STATUS[idx - 1] : undefined;
        const next = idx < LEAD_STATUS.length - 1 ? LEAD_STATUS[idx + 1] : undefined;
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {lead.temperatura ? (
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      LEAD_TEMPERATURA_DOT[lead.temperatura],
                    )}
                    aria-label={`Temperatura ${LEAD_TEMPERATURA_LABEL[lead.temperatura]}`}
                    title={LEAD_TEMPERATURA_LABEL[lead.temperatura]}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect?.(lead)}
                  className="min-w-0 flex-1 text-left text-sm font-medium leading-tight text-foreground hover:underline"
                >
                  {lead.nome_empresa}
                </button>
              </div>
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
              {typeof lead.valor_potencial === "number" ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <DollarSign className="h-3 w-3" />
                  {currency.format(lead.valor_potencial)}
                </span>
              ) : null}
            </div>

            {(lead.telefone || lead.whatsapp || lead.site || lead.instagram) ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {lead.whatsapp ? (
                  <span className="inline-flex items-center gap-1">
                    <a
                      href={`https://wa.me/${lead.whatsapp.replace(/\D+/g, "")}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                      title={`Abrir WhatsApp: ${lead.whatsapp}`}
                    >
                      <MessageCircle className="h-3 w-3" />
                      {lead.whatsapp}
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(lead.whatsapp!).then(() =>
                          toast.success("WhatsApp copiado!"),
                        );
                      }}
                      className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted hover:text-foreground"
                      aria-label="Copiar WhatsApp"
                      title="Copiar WhatsApp"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                ) : lead.telefone ? (
                  <span className="inline-flex items-center gap-1">
                    <a
                      href={`tel:${lead.telefone.replace(/\D+/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                      title={`Ligar: ${lead.telefone}`}
                    >
                      <Phone className="h-3 w-3" />
                      {lead.telefone}
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(lead.telefone!).then(() =>
                          toast.success("Telefone copiado!"),
                        );
                      }}
                      className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted hover:text-foreground"
                      aria-label="Copiar telefone"
                      title="Copiar telefone"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
                {lead.site ? (
                  <a
                    href={lead.site}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex max-w-[140px] items-center gap-1 truncate hover:text-foreground hover:underline"
                    title={lead.site}
                  >
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lead.site.replace(/^https?:\/\//, "").replace(/^www\./, "")}</span>
                  </a>
                ) : null}
                {lead.instagram ? (
                  <a
                    href={lead.instagram.startsWith("http") ? lead.instagram : `https://instagram.com/${lead.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                    title={lead.instagram}
                  >
                    <Instagram className="h-3 w-3" />
                    Instagram
                  </a>
                ) : null}
              </div>
            ) : null}


            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground ring-1 ring-inset ring-border">
                {LEAD_ORIGEM_LABEL[lead.origem]}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground">
                {lead.updated_at ? (
                  <span className="inline-flex items-center gap-1" title="Último contato">
                    <Clock className="h-3 w-3" />
                    {new Date(lead.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                ) : null}
                {lead.proxima_acao ? (
                  <span className="inline-flex items-center gap-1" title={lead.proxima_acao}>
                    <CalendarClock className="h-3 w-3" />
                    {lead.data_proxima_acao
                      ? new Date(lead.data_proxima_acao).toLocaleDateString("pt-BR")
                      : lead.proxima_acao}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
