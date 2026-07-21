import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useCalendarEvents } from "../hooks/use-calendar-events";
import { useTasks } from "../hooks/use-tasks";

type AgendaRow = {
  id: string;
  source: "task" | "event";
  titulo: string;
  hora_inicio: string | null;
  hora_fim: string | null;
};

function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function AgendaWidget() {
  const { data: tasks = [], isLoading: lt } = useTasks();
  const today = todayStr();
  const { data: events = [], isLoading: le } = useCalendarEvents({ from: today, to: today });

  const items = useMemo<AgendaRow[]>(() => {
    const list: AgendaRow[] = [];
    for (const t of tasks) {
      if (t.data === today && t.hora_inicio && t.status !== "cancelada") {
        list.push({
          id: `task-${t.id}`,
          source: "task",
          titulo: t.titulo,
          hora_inicio: t.hora_inicio,
          hora_fim: t.hora_fim,
        });
      }
    }
    for (const e of events) {
      list.push({
        id: `event-${e.id}`,
        source: "event",
        titulo: e.titulo,
        hora_inicio: e.hora_inicio,
        hora_fim: e.hora_fim,
      });
    }
    return list.sort((a, b) => (a.hora_inicio ?? "99") < (b.hora_inicio ?? "99") ? -1 : 1);
  }, [tasks, events, today]);

  const isLoading = lt || le;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-primary" />
          Agenda de hoje
        </CardTitle>
        <Link to="/tarefas" search={{ view: "agenda" }} className="text-xs text-muted-foreground hover:underline">
          Ver agenda
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem compromissos hoje.
          </p>
        ) : (
          items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-md border p-2">
              <div
                className={cn(
                  "flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium",
                  i.source === "task"
                    ? "bg-primary/10 text-primary"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                <Clock className="h-3 w-3" />
                <span className="mt-0.5">{i.hora_inicio?.slice(0, 5)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{i.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {i.source === "task" ? "Tarefa" : "Evento"}
                  {i.hora_fim ? ` · até ${i.hora_fim.slice(0, 5)}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
