import type { LeadStatus } from "./leads.types";

/* ─────────── Lead Events (histórico / auditoria) ─────────── */

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

/** Módulo de origem — preparado para agregar em `empresa_events` futuramente. */
export type LeadEventModule = "prospeccao";
export const LEAD_EVENT_MODULE_LABEL: Record<LeadEventModule, string> = {
  prospeccao: "Prospecção",
};

export interface LeadEvent {
  id: string;
  workspace_id: string;
  lead_id: string;
  tipo: LeadEventType;
  modulo: LeadEventModule;
  status_anterior?: LeadStatus;
  status_novo?: LeadStatus;
  descricao?: string;
  created_by?: string;
  created_by_name?: string;
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

/**
 * Payload JSONB para Lead Interactions.
 * Centraliza os dados específicos de diferentes tipos de interação.
 */
export interface LeadInteractionPayload {
  tipo: LeadInteractionType;
  direcao?: "incoming" | "outgoing";
  message_id?: string;
  external_id?: string;
  chat_id?: string;
  sender_phone?: string;
  receiver_phone?: string;
  instance_id?: string;
  provider?: string;
  mensagem: string;
  timestamp_whatsapp?: string;
  metadata?: Record<string, any>;
  [key: string]: any; // Flexibilidade para outros campos legados ou futuros
}

export interface LeadInteraction {
  id: string;
  workspace_id: string;
  lead_id: string;
  tipo: LeadInteractionType;
  /** @deprecated Usar interaction.created_at para timestamp de sistema ou payload.timestamp_whatsapp para o original */
  data: string;
  /** @deprecated Usar payload.mensagem */
  descricao: string;
  data_json: LeadInteractionPayload;
  responsavel_id?: string;
  created_at: string;
}

export type LeadInteractionInput = {
  tipo: LeadInteractionType;
  data?: string; // ISO
  descricao: string;
  responsavel_id?: string;
  payload?: Partial<LeadInteractionPayload>;
};

/* ─────────── Lead Tasks (próximas ações) ─────────── */

export const LEAD_TASK_STATUS = ["pendente", "concluida", "cancelada"] as const;
export type LeadTaskStatus = (typeof LEAD_TASK_STATUS)[number];

export const LEAD_TASK_STATUS_LABEL: Record<LeadTaskStatus, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Status derivado exibido na UI — "atrasada" é calculado (pendente + data passada). */
export type LeadTaskDerivedStatus = LeadTaskStatus | "atrasada";
export const LEAD_TASK_DERIVED_LABEL: Record<LeadTaskDerivedStatus, string> = {
  ...LEAD_TASK_STATUS_LABEL,
  atrasada: "Atrasada",
};

export const LEAD_TASK_PRIORIDADES = ["baixa", "media", "alta"] as const;
export type LeadTaskPrioridade = (typeof LEAD_TASK_PRIORIDADES)[number];

export const LEAD_TASK_PRIORIDADE_LABEL: Record<LeadTaskPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export interface LeadTask {
  id: string;
  workspace_id: string;
  lead_id: string;
  titulo: string;
  data?: string; // yyyy-MM-dd
  status: LeadTaskStatus;
  prioridade: LeadTaskPrioridade;
  responsavel_id?: string;
  created_at: string;
  updated_at: string;
}

export type LeadTaskInput = {
  titulo: string;
  data?: string;
  prioridade?: LeadTaskPrioridade;
  responsavel_id?: string;
};

/**
 * Deriva o status exibido considerando "atrasada".
 * Uma tarefa pendente com `data` anterior a hoje é considerada atrasada.
 */
export function deriveTaskStatus(task: LeadTask, today = new Date()): LeadTaskDerivedStatus {
  if (task.status === "pendente" && task.data) {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    if (task.data < `${y}-${m}-${d}`) return "atrasada";
  }
  return task.status;
}
