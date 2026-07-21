import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  MoreHorizontal,
  Pencil,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useSetTaskStatus, useSnoozeTask, useTasks } from "../hooks/use-tasks";
import type { Task } from "../types/central.types";
import {
  TASK_PRIORIDADE_LABEL,
  TASK_PRIORIDADE_ORDER,
  TASK_PRIORIDADE_TONE,
  deriveTaskStatus,
} from "../types/central.types";
import { TaskFormDrawer } from "./task-form-drawer";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
};

function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function HojeWidget() {
  const { data: tasks = [], isLoading } = useTasks();
  const setStatus = useSetTaskStatus();
  const snooze = useSnoozeTask();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const hoje = todayStr();

  const items = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          ((t.data && t.data <= hoje) ||
            (t.prazo && t.prazo <= hoje) ||
            t.prioridade === "urgente"),
      )
      .sort((a, b) => {
        const derA = deriveTaskStatus(a);
        const derB = deriveTaskStatus(b);
        if (derA === "atrasada" && derB !== "atrasada") return -1;
        if (derB === "atrasada" && derA !== "atrasada") return 1;
        return TASK_PRIORIDADE_ORDER[a.prioridade] - TASK_PRIORIDADE_ORDER[b.prioridade];
      })
      .slice(0, 10);
  }, [tasks, hoje]);

  async function onComplete(t: Task) {
    try {
      await setStatus.mutateAsync({ id: t.id, status: "concluida" });
      toast.success("Tarefa concluída");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao concluir");
    }
  }
  async function onSnooze(t: Task, days = 1) {
    try {
      await snooze.mutateAsync({ id: t.id, days });
      toast.success(`Adiada em ${days} dia${days > 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao adiar");
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Flag className="h-4 w-4 text-primary" />
            Hoje — precisa da sua atenção
          </CardTitle>
          <Link to="/tarefas" className="text-xs text-muted-foreground hover:underline">
            Ver tudo <ExternalLink className="ml-1 inline h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              🎉 Nada urgente por agora. Bom trabalho!
            </p>
          ) : (
            items.map((t) => {
              const derived = deriveTaskStatus(t);
              const isLate = derived === "atrasada";
              return (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 transition-colors",
                    isLate && "border-destructive/40 bg-destructive/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onComplete(t)}
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-muted-foreground/40 transition-colors hover:border-primary hover:bg-primary/10"
                    title="Concluir"
                  >
                    <Check className="h-3 w-3 opacity-0 transition-opacity hover:opacity-100" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.titulo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                          TONE_CLASSES[TASK_PRIORIDADE_TONE[t.prioridade]],
                        )}
                      >
                        <Flag className="h-3 w-3" />
                        {TASK_PRIORIDADE_LABEL[t.prioridade]}
                      </span>
                      {t.projeto ? (
                        <Badge variant="outline" className="font-normal">
                          {t.projeto}
                        </Badge>
                      ) : null}
                      {t.data ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t.data.split("-").reverse().join("/")}
                        </span>
                      ) : null}
                      {t.hora_inicio ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t.hora_inicio.slice(0, 5)}
                        </span>
                      ) : null}
                      {isLate ? (
                        <Badge variant="destructive" className="font-normal">
                          Atrasada
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onComplete(t)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Concluir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSnooze(t, 1)}>
                        <Timer className="mr-2 h-4 w-4" />
                        Adiar 1 dia
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSnooze(t, 7)}>
                        <Timer className="mr-2 h-4 w-4" />
                        Adiar 1 semana
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingTask(t)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <TaskFormDrawer
        open={Boolean(editingTask)}
        onOpenChange={(o) => !o && setEditingTask(null)}
        task={editingTask}
      />
    </>
  );
}
