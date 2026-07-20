import type { LeadStatus } from "./leads.types";

/* ─────────── Lead Events (histórico de estágio / auditoria) ─────────── */

export const LEAD_EVENT_TYPES = [
  "created",
  "status_changed",
  "updated",
  "converted",
  "interaction_added",
  "task_added",
  "task_completed",
] as const;
export type LeadEventType = (typeof LEAD_EVENT_TYPES)[number];

export const LEAD_EVENT_TYPE_LABEL: Record<LeadEventType, string> = {
  created: "Lead criado",
  status_changed: "Estágio alterado",
  updated: "Dados atualizados",
  converted: "Convertido em empresa",
  interaction_added: "Interação registrada",
  task_added: "Tarefa criada",
  task_completed: "Tarefa concluída",
};

export interface LeadEvent {
  id: string;
  workspace_id: string;
  lead_id: string;
  tipo: LeadEventType;
  status_anterior?: LeadStatus;
  status_novo?: LeadStatus;
  descricao?: string;
  created_by?: string;
  created_at: string;
}

/* ─────────── Lead Interactions ─────────── */

export const LEAD_INTERACTION_TYPES = [
  "ligacao",
  "whatsapp",
  "email",
  "reuniao",
  "nota",
] as const;
export type LeadInteractionType = (typeof LEAD_INTERACTION_TYPES)[number];

export const LEAD_INTERACTION_TYPE_LABEL: Record<LeadInteractionType, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
};

export interface LeadInteraction {
  id: string;
  workspace_id: string;
  lead_id: string;
  tipo: LeadInteractionType;
  data: string; // ISO
  descricao: string;
  responsavel_id?: string;
  created_at: string;
}

export type LeadInteractionInput = Omit<
  LeadInteraction,
  "id" | "workspace_id" | "lead_id" | "created_at"
>;

/* ─────────── Lead Tasks (próximas ações) ─────────── */

export const LEAD_TASK_STATUS = ["pendente", "concluida", "cancelada"] as const;
export type LeadTaskStatus = (typeof LEAD_TASK_STATUS)[number];

export const LEAD_TASK_STATUS_LABEL: Record<LeadTaskStatus, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export interface LeadTask {
  id: string;
  workspace_id: string;
  lead_id: string;
  titulo: string;
  data?: string; // yyyy-MM-dd
  status: LeadTaskStatus;
  responsavel_id?: string;
  created_at: string;
  updated_at: string;
}

export type LeadTaskInput = {
  titulo: string;
  data?: string;
  responsavel_id?: string;
};
