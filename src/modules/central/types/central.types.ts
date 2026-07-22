/**
 * Tipos do módulo Central — tarefas, checklist, anexos, comentários,
 * dependências e eventos de calendário.
 */

import type { Database } from "@/integrations/supabase/types";

/* ─────────── Enums ─────────── */

export const TASK_STATUS = [
  "pendente",
  "em_andamento",
  "aguardando",
  "homologacao",
  "concluida",
  "cancelada",
] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  homologacao: "Homologação",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
export const TASK_STATUS_ACCENT: Record<
  TaskStatus,
  "neutral" | "info" | "warning" | "success" | "destructive" | "primary"
> = {
  pendente: "neutral",
  em_andamento: "info",
  aguardando: "warning",
  homologacao: "primary",
  concluida: "success",
  cancelada: "destructive",
};

export const TASK_PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type TaskPrioridade = (typeof TASK_PRIORIDADES)[number];
export const TASK_PRIORIDADE_LABEL: Record<TaskPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};
export const TASK_PRIORIDADE_TONE: Record<
  TaskPrioridade,
  "neutral" | "info" | "warning" | "destructive"
> = {
  baixa: "neutral",
  media: "info",
  alta: "warning",
  urgente: "destructive",
};
export const TASK_PRIORIDADE_ORDER: Record<TaskPrioridade, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export const TASK_CATEGORIAS = [
  "comercial",
  "desenvolvimento",
  "marketing",
  "financeiro",
  "suporte",
  "administrativo",
  "conteudo",
  "videoaula",
  "projeto",
] as const;
export type TaskCategoria = (typeof TASK_CATEGORIAS)[number];
export const TASK_CATEGORIA_LABEL: Record<TaskCategoria, string> = {
  comercial: "Comercial",
  desenvolvimento: "Desenvolvimento",
  marketing: "Marketing",
  financeiro: "Financeiro",
  suporte: "Suporte",
  administrativo: "Administrativo",
  conteudo: "Conteúdo",
  videoaula: "Videoaula",
  projeto: "Projeto",
};

export const TASK_ORIGENS = [
  "manual",
  "lead",
  "crm",
  "projeto",
  "ia",
  "sistema",
] as const;
export type TaskOrigem = (typeof TASK_ORIGENS)[number];
export const TASK_ORIGEM_LABEL: Record<TaskOrigem, string> = {
  manual: "Manual",
  lead: "Lead",
  crm: "CRM",
  projeto: "Projeto",
  ia: "IA",
  sistema: "Sistema",
};

/* ─────────── Recorrência ─────────── */

export const RECURRENCE_FREQS = ["daily", "weekly", "monthly", "custom"] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];
export const RECURRENCE_FREQ_LABEL: Record<RecurrenceFreq, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  custom: "Personalizada",
};

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number; // a cada N unidades
  byweekday?: number[]; // 0=dom, 6=sáb (para weekly)
  bymonthday?: number; // dia do mês (para monthly)
  until?: string; // ISO date
}

/* ─────────── Task ─────────── */

export interface Task {
  id: string;
  workspace_id: string;
  criado_por: string | null;
  responsavel_id: string | null;
  titulo: string;
  descricao: string | null;
  categoria: TaskCategoria;
  status: TaskStatus;
  prioridade: TaskPrioridade;
  origem: TaskOrigem;
  origem_ref_tipo: string | null;
  origem_ref_id: string | null;
  modulo_relacionado: string | null;
  projeto: string | null;
  data: string | null; // yyyy-MM-dd (data de execução / agenda)
  data_inicio: string | null; // yyyy-MM-dd (data de início opcional)
  hora_inicio: string | null; // HH:mm:ss
  hora_fim: string | null;
  prazo: string | null; // yyyy-MM-dd (prazo final)
  observacoes: string | null;
  recurrence_rule: RecurrenceRule | null;
  recurrence_parent_id: string | null;
  ordem: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInput = {
  titulo: string;
  descricao?: string | null;
  categoria: TaskCategoria;
  status?: TaskStatus;
  prioridade: TaskPrioridade;
  origem?: TaskOrigem;
  origem_ref_tipo?: string | null;
  origem_ref_id?: string | null;
  modulo_relacionado?: string | null;
  projeto?: string | null;
  responsavel_id?: string | null;
  data?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  prazo?: string | null;
  observacoes?: string | null;
  recurrence_rule?: RecurrenceRule | null;
};

/** Status derivado — "atrasada" quando pendente/em_andamento com prazo passado. */
export type TaskDerivedStatus = TaskStatus | "atrasada";

export function deriveTaskStatus(task: Task, today = new Date()): TaskDerivedStatus {
  if (task.status !== "pendente" && task.status !== "em_andamento") return task.status;
  const ref = task.prazo ?? task.data;
  if (!ref) return task.status;
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  return ref < todayStr ? "atrasada" : task.status;
}

/* ─────────── Checklist ─────────── */

export interface ChecklistItem {
  id: string;
  task_id: string;
  workspace_id: string;
  titulo: string;
  done: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

/* ─────────── Attachments ─────────── */

export interface TaskAttachment {
  id: string;
  task_id: string;
  workspace_id: string;
  nome: string;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  storage_path: string;
  criado_por: string | null;
  created_at: string;
}

/* ─────────── Comments ─────────── */

export interface TaskComment {
  id: string;
  task_id: string;
  workspace_id: string;
  autor_id: string | null;
  autor_nome: string | null;
  corpo: string;
  created_at: string;
  updated_at: string;
}

/* ─────────── Dependencies ─────────── */

export interface TaskDependency {
  id: string;
  workspace_id: string;
  task_id: string; // bloqueada
  depends_on_task_id: string; // bloqueadora
  created_at: string;
}

/* ─────────── Calendar Events (não-tarefas) ─────────── */

export const CALENDAR_EVENT_TIPOS = [
  "reuniao",
  "pessoal",
  "externo",
  "outro",
] as const;
export type CalendarEventTipo = (typeof CALENDAR_EVENT_TIPOS)[number];
export const CALENDAR_EVENT_TIPO_LABEL: Record<CalendarEventTipo, string> = {
  reuniao: "Reunião",
  pessoal: "Pessoal",
  externo: "Externo",
  outro: "Outro",
};

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  criado_por: string | null;
  titulo: string;
  descricao: string | null;
  tipo: CalendarEventTipo;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  participantes: string[] | null;
  created_at: string;
  updated_at: string;
}

export type CalendarEventInput = {
  titulo: string;
  descricao?: string | null;
  tipo: CalendarEventTipo;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  local?: string | null;
  participantes?: string[] | null;
};

/* ─────────── Row helpers (Supabase → domínio) ─────────── */

type Tables = Database["public"]["Tables"];
export type TaskRow = Tables["tasks"]["Row"];
export type ChecklistRow = Tables["task_checklist_items"]["Row"];
export type AttachmentRow = Tables["task_attachments"]["Row"];
export type CommentRow = Tables["task_comments"]["Row"];
export type DependencyRow = Tables["task_dependencies"]["Row"];
export type CalendarEventRow = Tables["calendar_events"]["Row"];

/* ─────────── Item de agenda unificado (tarefa OU evento) ─────────── */

export type AgendaItem =
  | { kind: "task"; task: Task }
  | { kind: "event"; event: CalendarEvent };
