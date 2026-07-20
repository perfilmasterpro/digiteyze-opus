import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Circle, Flag, XCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCurrentUserId } from "@/lib/workspace";
import { cn } from "@/lib/utils";

import { useUpdateLeadTaskStatus } from "../hooks/use-lead-tasks";
import {
  LEAD_TASK_DERIVED_LABEL,
  LEAD_TASK_PRIORIDADE_LABEL,
  deriveTaskStatus,
  type LeadTask,
  type LeadTaskDerivedStatus,
  type LeadTaskPrioridade,
  type LeadTaskStatus,
} from "../types/entities.types";

const DERIVED_TONE: Record<LeadTaskDerivedStatus, StatusTone> = {
  pendente: "warning",
  atrasada: "destructive",
  concluida: "success",
  cancelada: "neutral",
};

const PRIORIDADE_TONE: Record<LeadTaskPrioridade, string> = {
  baixa: "text-muted-foreground",
  media: "text-info",
  alta: "text-destructive",
};

type Filter = "todas" | "minhas" | "vencidas" | "proximos7";

function fmt(d?: string) {
  if (!d) return "sem data";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inNext7Days(date: string): boolean {
  const today = todayISO();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  const y = in7.getFullYear();
  const m = String(in7.getMonth() + 1).padStart(2, "0");
  const day = String(in7.getDate()).padStart(2, "0");
  return date >= today && date <= `${y}-${m}-${day}`;
}

export function TaskList({ leadId, items }: { leadId: string; items: LeadTask[] }) {
  const update = useUpdateLeadTaskStatus(leadId);
  const currentUserId = useCurrentUserId();
  const [filter, setFilter] = useState<Filter>("todas");

  const filtered = useMemo(() => {
    return items.filter((t) => {
      switch (filter) {
        case "minhas":
          return t.responsavel_id === currentUserId;
        case "vencidas":
          return deriveTaskStatus(t) === "atrasada";
        case "proximos7":
          return t.status === "pendente" && t.data ? inNext7Days(t.data) : false;
        default:
          return true;
      }
    });
  }, [items, filter, currentUserId]);

  const handle = async (id: string, status: LeadTaskStatus) => {
    try {
      await update.mutateAsync({ id, status });
      toast.success(status === "concluida" ? "Tarefa concluída" : "Tarefa atualizada");
    } catch {
      toast.error("Não foi possível atualizar.");
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="minhas">Minhas</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
          <TabsTrigger value="proximos7">Próximos 7 dias</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa neste filtro"
          description="Crie tarefas ou ajuste os filtros acima."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.map((t) => {
                const derived = deriveTaskStatus(t);
                const done = t.status === "concluida";
                const cancelled = t.status === "cancelada";
                return (
                  <li key={t.id} className="flex items-start gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => handle(t.id, done ? "pendente" : "concluida")}
                      className="mt-0.5 text-muted-foreground hover:text-foreground"
                      aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
                      disabled={cancelled}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span
                          className={
                            done || cancelled
                              ? "text-sm text-muted-foreground line-through"
                              : "text-sm font-medium text-foreground"
                          }
                        >
                          {t.titulo}
                        </span>
                        <StatusBadge tone={DERIVED_TONE[derived]}>
                          {LEAD_TASK_DERIVED_LABEL[derived]}
                        </StatusBadge>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs",
                            PRIORIDADE_TONE[t.prioridade],
                          )}
                        >
                          <Flag className="h-3 w-3" />
                          {LEAD_TASK_PRIORIDADE_LABEL[t.prioridade]}
                        </span>
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        {fmt(t.data)}
                      </div>
                    </div>
                    {t.status === "pendente" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground"
                        onClick={() => handle(t.id, "cancelada")}
                      >
                        <XCircle className="h-4 w-4" />
                        Cancelar
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
