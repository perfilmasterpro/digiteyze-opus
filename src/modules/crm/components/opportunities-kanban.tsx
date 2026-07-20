import { CalendarClock, MoreVertical, Percent, User } from "lucide-react";

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
import { useEmpresas } from "@/modules/empresas";

import {
  OPPORTUNITY_KANBAN_STAGES,
  OPPORTUNITY_STATUS_LABEL,
  type Opportunity,
  type OpportunityStatus,
} from "../types/opportunities.types";

const STATUS_ACCENT: Record<OpportunityStatus, KanbanColumn<Opportunity>["accent"]> = {
  aberto: "neutral",
  qualificado: "info",
  proposta: "primary",
  negociacao: "warning",
  ganho: "success",
  perdido: "destructive",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type Props = {
  opportunities: Opportunity[];
  onSelect?: (opp: Opportunity) => void;
  onChangeStatus?: (opp: Opportunity, status: OpportunityStatus) => void;
  canMove?: boolean;
};

export function OpportunitiesKanban({
  opportunities,
  onSelect,
  onChangeStatus,
  canMove,
}: Props) {
  const { data: empresas } = useEmpresas();
  const empresaById = new Map((empresas ?? []).map((e) => [e.id, e.nome] as const));

  const columns: KanbanColumn<Opportunity>[] = OPPORTUNITY_KANBAN_STAGES.map((status) => {
    const items = opportunities.filter((o) => o.status === status);
    const total = items.reduce((s, o) => s + (o.valor_estimado || 0), 0);
    return {
      id: status,
      title: OPPORTUNITY_STATUS_LABEL[status],
      accent: STATUS_ACCENT[status],
      items,
      subtitle: (
        <span className="inline-flex items-center gap-2">
          <span className="font-medium text-foreground">{currency.format(total)}</span>
          <span aria-hidden>·</span>
          <span>
            {items.length} {items.length === 1 ? "opp." : "opps."}
          </span>
        </span>
      ),
    };
  });

  const handleDrop = (id: string, target: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (!opp || !onChangeStatus) return;
    if (opp.status === target) return;
    onChangeStatus(opp, target as OpportunityStatus);
  };

  return (
    <KanbanBoard
      columns={columns}
      itemKey={(o) => o.id}
      onDropItem={canMove ? handleDrop : undefined}
      renderCard={(opp) => {
        const stages = OPPORTUNITY_KANBAN_STAGES;
        const idx = stages.indexOf(opp.status as (typeof stages)[number]);
        const prev = idx > 0 ? stages[idx - 1] : undefined;
        const next = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : undefined;
        const empresaNome = empresaById.get(opp.empresa_id) ?? "Empresa";
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelect?.(opp)}
                  className="text-left text-sm font-medium leading-tight text-foreground hover:underline"
                >
                  {opp.nome}
                </button>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{empresaNome}</p>
              </div>
              {canMove && onChangeStatus ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-1 -mt-1 h-7 w-7 text-muted-foreground"
                      aria-label="Ações da oportunidade"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mover estágio</DropdownMenuLabel>
                    <DropdownMenuItem
                      disabled={!next}
                      onSelect={() => next && onChangeStatus(opp, next)}
                    >
                      Avançar {next ? `→ ${OPPORTUNITY_STATUS_LABEL[next]}` : ""}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!prev}
                      onSelect={() => prev && onChangeStatus(opp, prev)}
                    >
                      Voltar {prev ? `→ ${OPPORTUNITY_STATUS_LABEL[prev]}` : ""}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Escolher estágio
                    </DropdownMenuLabel>
                    {stages.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        disabled={s === opp.status}
                        onSelect={() => onChangeStatus(opp, s)}
                        className={s === opp.status ? "font-medium" : ""}
                      >
                        {OPPORTUNITY_STATUS_LABEL[s]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {currency.format(opp.valor_estimado || 0)}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Percent className="h-3 w-3" />
                {opp.probabilidade}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {opp.responsavel_nome ? (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {opp.responsavel_nome}
                </span>
              ) : null}
              {opp.data_fechamento_prevista ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {new Date(opp.data_fechamento_prevista).toLocaleDateString("pt-BR")}
                </span>
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
}
