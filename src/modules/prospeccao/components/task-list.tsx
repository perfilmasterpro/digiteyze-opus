import { CalendarClock, CheckCircle2, Circle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useUpdateLeadTaskStatus } from "../hooks/use-lead-tasks";
import {
  LEAD_TASK_STATUS_LABEL,
  type LeadTask,
  type LeadTaskStatus,
} from "../types/entities.types";

const TONE: Record<LeadTaskStatus, StatusTone> = {
  pendente: "warning",
  concluida: "success",
  cancelada: "neutral",
};

function fmt(d?: string) {
  if (!d) return "sem data";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function TaskList({ leadId, items }: { leadId: string; items: LeadTask[] }) {
  const update = useUpdateLeadTaskStatus(leadId);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa"
        description="Crie tarefas para não perder próximos passos com este lead."
      />
    );
  }

  const handle = async (id: string, status: LeadTaskStatus) => {
    try {
      await update.mutateAsync({ id, status });
      toast.success(status === "concluida" ? "Tarefa concluída" : "Tarefa atualizada");
    } catch {
      toast.error("Não foi possível atualizar.");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {items.map((t) => {
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
                    <StatusBadge tone={TONE[t.status]}>{LEAD_TASK_STATUS_LABEL[t.status]}</StatusBadge>
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
  );
}
