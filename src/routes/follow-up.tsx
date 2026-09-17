import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Check, Clock3, ListTodo, Phone, Target } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_EMOJI,
  type Lead,
} from "@/modules/prospeccao/types/leads.types";
import { useLeads } from "@/modules/prospeccao/hooks/use-leads";
import {
  TASK_PRIORIDADE_LABEL,
  TASK_PRIORIDADE_TONE,
  TASK_STATUS_LABEL,
  deriveTaskStatus,
  type Task,
} from "@/modules/central/types/central.types";
import { useSetTaskStatus, useTasks } from "@/modules/central/hooks/use-tasks";

export const Route = createFileRoute("/follow-up")({
  head: () => ({
    meta: [
      { title: "Follow-up — Growth OS" },
      {
        name: "description",
        content: "Acompanhe as próximas ações dos leads e as tarefas comerciais já criadas.",
      },
    ],
  }),
  component: FollowUpPage,
});

type FollowUpItem = {
  lead: Lead;
  actionDate: string | null;
  tasks: Task[];
  overdue: boolean;
};

function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem data";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function actionLabel(lead: Lead) {
  return lead.proxima_acao?.trim() || "Fazer follow-up";
}

function FollowUpPage() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading: leadsLoading, isError: leadsError, refetch: refetchLeads } = useLeads();
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const setTaskStatus = useSetTaskStatus();
  const today = todayString();

  const items = useMemo<FollowUpItem[]>(() => {
    const activeLeads = leads.filter((lead) => lead.status !== "cliente" && lead.status !== "perdido");
    return activeLeads
      .map((lead) => {
        const leadTasks = tasks.filter(
          (task) =>
            task.status !== "concluida" &&
            task.status !== "cancelada" &&
            task.origem_ref_id === lead.id,
        );
        const taskDates = leadTasks.map((task) => task.prazo ?? task.data).filter(Boolean) as string[];
        const actionDate = lead.data_proxima_acao ?? taskDates.sort()[0] ?? null;
        const overdue = Boolean(actionDate && actionDate < today);
        return { lead, actionDate, tasks: leadTasks, overdue };
      })
      .filter((item) => item.actionDate || item.lead.proxima_acao || item.tasks.length > 0)
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        if (!a.actionDate) return 1;
        if (!b.actionDate) return -1;
        return a.actionDate.localeCompare(b.actionDate);
      });
  }, [leads, tasks, today]);

  const counts = useMemo(() => {
    const atrasados = items.filter((item) => item.overdue).length;
    const hoje = items.filter((item) => item.actionDate === today).length;
    const proximos = items.filter((item) => item.actionDate && item.actionDate > today).length;
    return { total: items.length, atrasados, hoje, proximos };
  }, [items, today]);

  if (leadsLoading || tasksLoading) return <LoadingState label="Carregando follow-ups…" />;
  if (leadsError || tasksError) {
    return <ErrorState title="Não foi possível carregar o Follow-up" onRetry={() => { void refetchLeads(); void refetchTasks(); }} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-up"
        icon={<CalendarClock className="h-5 w-5" />}
        description="Próximas ações dos leads e tarefas comerciais em um único lugar."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/tarefas" })}>
            <ListTodo className="mr-1 h-4 w-4" />
            Ver todas as tarefas
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Pendências" value={counts.total} icon={<Target className="h-4 w-4" />} />
        <SummaryCard label="Atrasados" value={counts.atrasados} icon={<Clock3 className="h-4 w-4" />} tone="destructive" />
        <SummaryCard label="Hoje" value={counts.hoje} icon={<CalendarClock className="h-4 w-4" />} tone="primary" />
        <SummaryCard label="Próximos" value={counts.proximos} icon={<CalendarClock className="h-4 w-4" />} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nenhum follow-up pendente"
          description="Quando um lead tiver uma próxima ação ou uma tarefa vinculada, ela aparecerá aqui."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FollowUpCard
              key={item.lead.id}
              item={item}
              today={today}
              onOpenLead={() => navigate({ to: "/prospeccao/$id", params: { id: item.lead.id } })}
              onComplete={(taskId) => setTaskStatus.mutate({ id: taskId, status: "concluida" })}
              completing={setTaskStatus.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: "neutral" | "destructive" | "primary";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("grid h-9 w-9 place-items-center rounded-md bg-muted", tone === "destructive" && "bg-destructive/10 text-destructive", tone === "primary" && "bg-primary/10 text-primary")}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUpCard({
  item,
  today,
  onOpenLead,
  onComplete,
  completing,
}: {
  item: FollowUpItem;
  today: string;
  onOpenLead: () => void;
  onComplete: (taskId: string) => void;
  completing: boolean;
}) {
  const { lead } = item;
  const primaryTask = item.tasks[0];
  const dateLabel = item.actionDate === today ? "Hoje" : formatDate(item.actionDate);

  return (
    <Card className={cn("border-l-4", item.overdue ? "border-l-destructive" : "border-l-primary")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onOpenLead} className="truncate text-left font-semibold hover:underline">
                {lead.nome_empresa}
              </button>
              <Badge variant="outline">{LEAD_STATUS_LABEL[lead.status]}</Badge>
              {lead.temperatura ? <span title={`Temperatura: ${lead.temperatura}`}>{LEAD_TEMPERATURA_EMOJI[lead.temperatura]}</span> : null}
              {item.overdue ? <Badge variant="destructive">Atrasado</Badge> : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{actionLabel(lead)}</span>
              <span>•</span>
              <span>{dateLabel}</span>
              {lead.contato_nome ? <><span>•</span><span>{lead.contato_nome}</span></> : null}
              {lead.telefone || lead.whatsapp ? <><span>•</span><span>{lead.telefone || lead.whatsapp}</span></> : null}
            </div>

            {primaryTask ? (
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Tarefa: {primaryTask.titulo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{TASK_STATUS_LABEL[primaryTask.status]}</Badge>
                      <Badge variant="outline" className={cn(TASK_PRIORIDADE_TONE[primaryTask.prioridade] === "destructive" && "border-destructive/40 text-destructive")}>
                        {TASK_PRIORIDADE_LABEL[primaryTask.prioridade]}
                      </Badge>
                      {deriveTaskStatus(primaryTask) === "atrasada" ? <Badge variant="destructive">Tarefa atrasada</Badge> : null}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onComplete(primaryTask.id)} disabled={completing}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Concluir tarefa
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 md:flex-col">
            <Button size="sm" onClick={onOpenLead}>Abrir lead</Button>
            {lead.telefone || lead.whatsapp ? (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${lead.telefone || lead.whatsapp}`}>
                  <Phone className="mr-1 h-3.5 w-3.5" />
                  Ligar
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
