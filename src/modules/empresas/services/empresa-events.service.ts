/**
 * Serviço de eventos unificados da Empresa.
 *
 * `empresa_events` é o *event log* consumido pela Timeline da página 360°.
 * Cada módulo (Prospecção, Comercial, Projetos, Financeiro, Suporte)
 * publica aqui via `publishEmpresaEvent()` — nunca acessa storage direto de
 * outro módulo. A leitura é feita via `listEmpresaEvents()`.
 *
 * Persistência atual: `localStorage`. Assinaturas mantidas estáveis para a
 * futura migração ao Supabase (tabela `empresa_events` com RLS por
 * `workspace_id` + índice `workspace_id, empresa_id, occurred_at DESC`).
 */

export const EMPRESA_EVENT_MODULES = [
  "empresas",
  "prospeccao",
  "comercial",
  "projetos",
  "financeiro",
  "suporte",
] as const;
export type EmpresaEventModule = (typeof EMPRESA_EVENT_MODULES)[number];

export const EMPRESA_EVENT_MODULE_LABEL: Record<EmpresaEventModule, string> = {
  empresas: "Empresa",
  prospeccao: "Prospecção",
  comercial: "Comercial",
  projetos: "Projetos",
  financeiro: "Financeiro",
  suporte: "Suporte",
};

export const EMPRESA_EVENT_TYPES = [
  "empresa.created",
  "empresa.updated",
  "lead.created",
  "lead.updated",
  "lead.stage_changed",
  "lead.interaction_created",
  "lead.task_created",
  "lead.converted",
  "opportunity.created",
  "opportunity.updated",
  "opportunity.stage_changed",
  "opportunity.won",
  "opportunity.lost",
] as const;
export type EmpresaEventType = (typeof EMPRESA_EVENT_TYPES)[number];

export const EMPRESA_EVENT_TYPE_LABEL: Record<EmpresaEventType, string> = {
  "empresa.created": "Empresa criada",
  "empresa.updated": "Empresa atualizada",
  "lead.created": "Lead criado",
  "lead.updated": "Lead atualizado",
  "lead.stage_changed": "Estágio alterado",
  "lead.interaction_created": "Interação registrada",
  "lead.task_created": "Tarefa criada",
  "lead.converted": "Lead convertido em empresa",
  "opportunity.created": "Oportunidade criada",
  "opportunity.updated": "Oportunidade atualizada",
  "opportunity.stage_changed": "Estágio da oportunidade alterado",
  "opportunity.won": "Oportunidade ganha",
  "opportunity.lost": "Oportunidade perdida",
};


export interface EmpresaEvent {
  id: string;
  workspace_id: string;
  empresa_id: string;
  modulo: EmpresaEventModule;
  tipo: EmpresaEventType;
  titulo: string;
  descricao?: string;
  created_by?: string;
  created_by_name?: string;
  occurred_at: string; // ISO — quando o fato aconteceu
  payload?: Record<string, unknown>;
}

export type PublishEmpresaEventInput = {
  workspaceId: string;
  empresaId: string;
  modulo: EmpresaEventModule;
  tipo: EmpresaEventType;
  titulo: string;
  descricao?: string;
  createdBy?: string;
  createdByName?: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
};

const STORAGE_KEY = "growth-os:empresa-events";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): EmpresaEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmpresaEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: EmpresaEvent[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `eev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listEmpresaEvents(
  workspaceId: string,
  empresaId: string,
): Promise<EmpresaEvent[]> {
  return readAll()
    .filter((e) => e.workspace_id === workspaceId && e.empresa_id === empresaId)
    .sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
}

export async function publishEmpresaEvent(
  input: PublishEmpresaEventInput,
): Promise<EmpresaEvent> {
  const event: EmpresaEvent = {
    id: generateId(),
    workspace_id: input.workspaceId,
    empresa_id: input.empresaId,
    modulo: input.modulo,
    tipo: input.tipo,
    titulo: input.titulo,
    descricao: input.descricao,
    created_by: input.createdBy,
    created_by_name: input.createdByName,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    payload: input.payload,
  };
  const list = readAll();
  list.unshift(event);
  writeAll(list);
  return event;
}
