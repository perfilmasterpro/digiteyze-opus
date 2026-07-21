/**
 * Serviço de eventos unificados da Empresa (persistido no Supabase).
 *
 * Tabela `empresa_events` — RLS por `is_workspace_member(workspace_id)`.
 * O payload de domínio (módulo, tipo, título, autor, etc.) fica em `data`
 * (JSONB); `occurred_at` é coluna relacional para permitir ordenação e
 * futuras views/paginate por cursor.
 */

import { supabase } from "@/integrations/supabase/client";

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
  "proposal.created",
  "proposal.sent",
  "proposal.approved",
  "proposal.rejected",
  "proposal.expired",
  "proposal.pdf_generated",
  "contract.created",
  "contract.updated",
  "contract.sent",
  "contract.signed",
  "contract.cancelled",
  "signature.created",
  "signature.sent",
  "signature.viewed",
  "signature.signed",
  "signature.rejected",
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
  "proposal.created": "Proposta criada",
  "proposal.sent": "Proposta enviada",
  "proposal.approved": "Proposta aprovada",
  "proposal.rejected": "Proposta recusada",
  "proposal.expired": "Proposta expirada",
  "proposal.pdf_generated": "PDF da proposta gerado",
  "contract.created": "Contrato criado",
  "contract.updated": "Contrato atualizado",
  "contract.sent": "Contrato enviado",
  "contract.signed": "Contrato assinado",
  "contract.cancelled": "Contrato cancelado",
  "signature.created": "Assinatura solicitada",
  "signature.sent": "Assinatura enviada",
  "signature.viewed": "Assinatura visualizada",
  "signature.signed": "Documento assinado",
  "signature.rejected": "Assinatura recusada",
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
  occurred_at: string;
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

type EmpresaEventRow = {
  id: string;
  workspace_id: string;
  empresa_id: string;
  occurred_at: string;
  data: Record<string, unknown>;
};

function rowToEvent(row: EmpresaEventRow): EmpresaEvent {
  const d = (row.data ?? {}) as Partial<EmpresaEvent> & {
    payload?: Record<string, unknown>;
  };
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    empresa_id: row.empresa_id,
    occurred_at: row.occurred_at,
    modulo: (d.modulo ?? "empresas") as EmpresaEventModule,
    tipo: (d.tipo ?? "empresa.updated") as EmpresaEventType,
    titulo: d.titulo ?? "",
    descricao: d.descricao,
    created_by: d.created_by,
    created_by_name: d.created_by_name,
    payload: d.payload,
  };
}

export async function listEmpresaEvents(
  workspaceId: string,
  empresaId: string,
): Promise<EmpresaEvent[]> {
  const { data, error } = await supabase
    .from("empresa_events")
    .select("id, workspace_id, empresa_id, occurred_at, data")
    .eq("workspace_id", workspaceId)
    .eq("empresa_id", empresaId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToEvent(r as EmpresaEventRow));
}

export async function publishEmpresaEvent(
  input: PublishEmpresaEventInput,
): Promise<EmpresaEvent> {
  const eventData = {
    modulo: input.modulo,
    tipo: input.tipo,
    titulo: input.titulo,
    descricao: input.descricao,
    created_by: input.createdBy,
    created_by_name: input.createdByName,
    payload: input.payload,
  };
  const { data, error } = await supabase
    .from("empresa_events")
    .insert({
      workspace_id: input.workspaceId,
      empresa_id: input.empresaId,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      data: eventData as unknown as Record<string, unknown>,
    })
    .select("id, workspace_id, empresa_id, occurred_at, data")
    .single();
  if (error) throw error;
  return rowToEvent(data as EmpresaEventRow);
}
