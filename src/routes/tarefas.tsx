import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check, KanbanSquare, List, ListTodo, Plus } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { TaskFormDrawer } from "@/modules/central/components/task-form-drawer";
import { useSetTaskStatus, useTasks } from "@/modules/central/hooks/use-tasks";
import {
  TASK_PRIORIDADE_LABEL,
  TASK_PRIORIDADE_TONE,
  TASK_STATUS,
  TASK_STATUS_LABEL,
  type Task,
  type TaskStatus,
  deriveTaskStatus,
} from "@/modules/central/types/central.types";

const searchSchema = z.object({
  view: z.enum(["lista", "kanban", "calendario", "agenda"]).default("lista"),
  filtro: z
    .enum(["todas", "pendentes", "em_andamento", "concluidas", "atrasadas"])
    .default("todas"),
});

export const Route = createFileRoute("/tarefas")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Tarefas — Growth OS" },
      {
        name: "description",
        content:
          "Gerencie suas tarefas em lista, kanban, calendário ou agenda do dia. Recorrência, prioridades e projetos.",
      },
      { property: "og:title", content: "Tarefas — Growth OS" },
      { property: "og:description", content: "Gestão completa de tarefas do Growth OS." },
    ],
  }),
  component: TarefasPage,
});

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  destructive: "bg-destructive/10 text-destructive",
};

const PRIORIDADE_DOT: Record<string, string> = {
  baixa: "bg-emerald-500",
  media: "bg-yellow-500",
  alta: "bg-orange-500",
  urgente: "bg-red-500",
};

const PRIORIDADE_BORDER: Record<string, string> = {
  baixa: "border-l-emerald-500",
  media: "border-l-yellow-500",
  alta: "border-l-orange-500",
  urgente: "border-l-red-500",
};

function PriorityBadge({ prioridade }: { prioridade: keyof typeof PRIORIDADE_DOT }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[TASK_PRIORIDADE_TONE[prioridade as keyof typeof TASK_PRIORIDADE_TONE]],
      )}
      title={`Prioridade: ${TASK_PRIORIDADE_LABEL[prioridade as keyof typeof TASK_PRIORIDADE_LABEL]}`}
    >
      <span className={cn("h-2 w-2 rounded-full", PRIORIDADE_DOT[prioridade])} aria-hidden />
      {TASK_PRIORIDADE_LABEL[prioridade as keyof typeof TASK_PRIORIDADE_LABEL]}
    </span>
  );
}

function TarefasPage() {
  const { view, filtro } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: tasks = [], isLoading } = useTasks();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [q, setQ] = useState("");
  const [projeto, setProjeto] = useState<string>("__all");

  const projetos = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (t.projeto) set.add(t.projeto);
    return Array.from(set).sort();
  }, [tasks]);

  const counts = useMemo(() => {
    const base = { todas: tasks.length, pendentes: 0, em_andamento: 0, concluidas: 0, atrasadas: 0 };
    for (const t of tasks) {
      const d = deriveTaskStatus(t);
      if (d === "atrasada") base.atrasadas++;
      if (t.status === "pendente") base.pendentes++;
      if (t.status === "em_andamento") base.em_andamento++;
      if (t.status === "concluida") base.concluidas++;
    }
    return base;
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (projeto !== "__all" && t.projeto !== projeto) return false;
      if (q && !t.titulo.toLowerCase().includes(q.toLowerCase())) return false;
      const derived = deriveTaskStatus(t);
      switch (filtro) {
        case "pendentes":
          if (t.status !== "pendente") return false;
          break;
        case "em_andamento":
          if (t.status !== "em_andamento") return false;
          break;
        case "concluidas":
          if (t.status !== "concluida") return false;
          break;
        case "atrasadas":
          if (derived !== "atrasada") return false;
          break;
        case "todas":
        default:
          break;
      }
      return true;
    });
  }, [tasks, projeto, q, filtro]);

  return (
    <div>
      <PageHeader
        title="Tarefas"
        icon={<ListTodo className="h-5 w-5" />}
        description="Lista, kanban, calendário e agenda. Recorrência e checklists inclusos."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="mr-1 h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tabs
          value={view}
          onValueChange={(v) =>
            navigate({
              search: {
                view: v as "lista" | "kanban" | "calendario" | "agenda",
                filtro,
              },
            })
          }
        >
          <TabsList>
            <TabsTrigger value="lista"><List className="mr-1 h-4 w-4" />Lista</TabsTrigger>
            <TabsTrigger value="kanban"><KanbanSquare className="mr-1 h-4 w-4" />Kanban</TabsTrigger>
            <TabsTrigger value="agenda"><CalendarDays className="mr-1 h-4 w-4" />Agenda</TabsTrigger>
            <TabsTrigger value="calendario"><CalendarDays className="mr-1 h-4 w-4" />Calendário</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-56"
          />
          <Select value={projeto} onValueChange={setProjeto}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os projetos</SelectItem>
              {projetos.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {(
          [
            ["todas", `Todas (${counts.todas})`],
            ["pendentes", `Pendentes (${counts.pendentes})`],
            ["em_andamento", `Em andamento (${counts.em_andamento})`],
            ["concluidas", `Concluídas (${counts.concluidas})`],
            ["atrasadas", `Atrasadas (${counts.atrasadas})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate({ search: { view, filtro: key } })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filtro === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : view === "kanban" ? (
        <KanbanView tasks={filtered} onEdit={(t) => { setEditing(t); setOpenForm(true); }} />
      ) : view === "agenda" ? (
        <AgendaView tasks={filtered} onEdit={(t) => { setEditing(t); setOpenForm(true); }} />
      ) : view === "calendario" ? (
        <CalendarView tasks={filtered} onEdit={(t) => { setEditing(t); setOpenForm(true); }} />
      ) : (
        <ListView tasks={filtered} onEdit={(t) => { setEditing(t); setOpenForm(true); }} />
      )}

      <TaskFormDrawer
        open={openForm}
        onOpenChange={(o) => { setOpenForm(o); if (!o) setEditing(null); }}
        task={editing}
      />
    </div>
  );
}

/* ─────────── Lista ─────────── */

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function ListView({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const setStatus = useSetTaskStatus();
  if (tasks.length === 0) {
    return <EmptyMessage msg="Nenhuma tarefa encontrada." />;
  }
  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const derived = deriveTaskStatus(t);
        const isDone = t.status === "concluida";
        return (
          <div
            key={t.id}
            className={cn(
              "flex w-full items-start gap-3 rounded-md border border-l-4 bg-card p-3 text-left transition-colors hover:bg-accent/30",
              PRIORIDADE_BORDER[t.prioridade],
              derived === "atrasada" && "border-destructive/40",
              isDone && "opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={isDone}
              onChange={(e) =>
                setStatus.mutate({ id: t.id, status: e.target.checked ? "concluida" : "pendente" })
              }
              className="mt-1 h-4 w-4"
            />
            <button
              type="button"
              onClick={() => onEdit(t)}
              className="min-w-0 flex-1 text-left"
            >
              <p className={cn("truncate text-sm font-medium", isDone && "line-through")}>
                {t.titulo}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <PriorityBadge prioridade={t.prioridade} />
                <Badge variant="outline" className="font-normal">
                  {TASK_STATUS_LABEL[t.status]}
                </Badge>
                {t.projeto ? <Badge variant="outline">{t.projeto}</Badge> : null}
                {t.data ? <span>Data: {t.data.split("-").reverse().join("/")}</span> : null}
                {t.hora_inicio ? <span>{t.hora_inicio.slice(0, 5)}</span> : null}
                {t.prazo ? <span>Prazo: {t.prazo.split("-").reverse().join("/")}</span> : null}
                {derived === "atrasada" ? <Badge variant="destructive">Atrasada</Badge> : null}
                <span title={new Date(t.created_at).toLocaleString("pt-BR")}>
                  Criada: {fmtDateTime(t.created_at)}
                </span>
                {isDone && t.completed_at ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Concluída: {fmtDateTime(t.completed_at)}
                  </span>
                ) : null}
              </div>
            </button>
            {!isDone ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setStatus.mutate({ id: t.id, status: "concluida" })}
                disabled={setStatus.isPending}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Concluir
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Kanban ─────────── */

const KANBAN_COLUMNS: TaskStatus[] = [
  "pendente",
  "em_andamento",
  "aguardando",
  "homologacao",
  "concluida",
];

function KanbanView({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const setStatus = useSetTaskStatus();
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      pendente: [], em_andamento: [], aguardando: [], homologacao: [], concluida: [], cancelada: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col} className="min-w-[280px] flex-1 rounded-md bg-muted/40 p-2">
          <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium">
            <span>{TASK_STATUS_LABEL[col]}</span>
            <Badge variant="outline">{grouped[col].length}</Badge>
          </div>
          <div className="space-y-2">
            {grouped[col].map((t) => {
              const isDone = t.status === "concluida";
              return (
                <Card
                  key={t.id}
                  className={cn(
                    "cursor-pointer border-l-4 hover:bg-accent/40",
                    PRIORIDADE_BORDER[t.prioridade],
                    isDone && "opacity-60",
                  )}
                  onClick={() => onEdit(t)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("line-clamp-2 text-sm font-medium", isDone && "line-through")}>{t.titulo}</p>
                      <span
                        className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", PRIORIDADE_DOT[t.prioridade])}
                        title={`Prioridade: ${TASK_PRIORIDADE_LABEL[t.prioridade]}`}
                        aria-label={`Prioridade ${TASK_PRIORIDADE_LABEL[t.prioridade]}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <PriorityBadge prioridade={t.prioridade} />
                      {t.projeto ? <Badge variant="outline">{t.projeto}</Badge> : null}
                      {t.data ? <span>{t.data.split("-").reverse().join("/")}</span> : null}
                    </div>
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <div>Criada: {fmtDateTime(t.created_at)}</div>
                      {isDone && t.completed_at ? (
                        <div className="text-emerald-600 dark:text-emerald-400">
                          Concluída: {fmtDateTime(t.completed_at)}
                        </div>
                      ) : null}
                    </div>
                    {!isDone ? (
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatus.mutate({ id: t.id, status: "concluida" });
                          }}
                          disabled={setStatus.isPending}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Concluir
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Agenda ─────────── */

function AgendaView({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(
    () =>
      tasks
        .filter((t) => t.data === today && t.status !== "cancelada")
        .sort((a, b) => (a.hora_inicio ?? "99") < (b.hora_inicio ?? "99") ? -1 : 1),
    [tasks, today],
  );
  if (rows.length === 0) return <EmptyMessage msg="Nada na agenda de hoje." />;
  return (
    <div className="space-y-2">
      {rows.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onEdit(t)}
          className="flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left hover:bg-accent/30"
        >
          <div className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {t.hora_inicio?.slice(0, 5) ?? "--:--"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.titulo}</p>
            {t.projeto ? (
              <p className="text-xs text-muted-foreground">{t.projeto}</p>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─────────── Calendário (mês) ─────────── */

function CalendarView({ tasks, onEdit }: { tasks: Task[]; onEdit: (t: Task) => void }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.data) continue;
      const arr = map.get(t.data) ?? [];
      arr.push(t);
      map.set(t.data, arr);
    }
    return map;
  }, [tasks]);

  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: ds, day: d });
  }

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const today = now.toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {weekdays.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={cn("min-h-[90px] rounded-md border p-1 text-xs", c?.date === today && "border-primary bg-primary/5")}>
            {c ? (
              <>
                <div className="mb-1 font-medium">{c.day}</div>
                <div className="space-y-0.5">
                  {(byDate.get(c.date) ?? []).slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onEdit(t)}
                      className={cn("block w-full truncate rounded px-1 text-left", TONE_CLASSES[TASK_PRIORIDADE_TONE[t.prioridade]])}
                    >
                      {t.titulo}
                    </button>
                  ))}
                  {(byDate.get(c.date)?.length ?? 0) > 3 ? (
                    <span className="text-muted-foreground">+{(byDate.get(c.date)?.length ?? 0) - 3}</span>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyMessage({ msg }: { msg: string }) {
  return <p className="py-16 text-center text-sm text-muted-foreground">{msg}</p>;
}

// silence unused
void TASK_STATUS;
