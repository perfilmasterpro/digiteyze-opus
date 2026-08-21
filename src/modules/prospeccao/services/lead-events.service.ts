import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { LeadEvent, LeadEventModule, LeadEventType } from "../types/entities.types";
import type { LeadStatus } from "../types/leads.types";

/**
 * Service do domínio Prospecção (Lead Events).
 * 
 * Fonte primária: tabela `public.lead_events` (Supabase).
 * Fallback: localStorage (`growth-os:lead-events`) apenas para leitura de dados legados.
 */

const STORAGE_KEY = "growth-os:lead-events";

function isBrowser() {
  return typeof window !== "undefined";
}

/* ─────────────────── Fallback localStorage (legado) ─────────────────── */

function readLocalLegacy(): LeadEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeadEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ─────────────────── Mapeamento row ↔ domínio ─────────────────── */

type LeadEventRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  data: Json;
  created_at: string;
};

/**
 * Mapeia a linha física do banco para a interface LeadEvent do domínio.
 * A estrutura do banco armazena campos variáveis em `data` (jsonb).
 */
function rowToLeadEvent(row: LeadEventRow): LeadEvent {
  const d = (row.data ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    lead_id: row.lead_id,
    tipo: (d.tipo as LeadEventType) || "updated",
    modulo: (d.modulo as LeadEventModule) || "prospeccao",
    status_anterior: d.status_anterior as LeadStatus | undefined,
    status_novo: d.status_novo as LeadStatus | undefined,
    descricao: d.descricao as string | undefined,
    created_by: d.created_by as string | undefined,
    created_by_name: d.created_by_name as string | undefined,
    created_at: row.created_at,
  };
}

/* ─────────────────── API pública ─────────────────── */

export async function listLeadEvents(
  workspaceId: string,
  leadId: string,
): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from("lead_events")
    .select("id, workspace_id, lead_id, data, created_at")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[lead-events.service] Falha ao ler Supabase:", error.message);
    return readLocalLegacy()
      .filter((e) => e.workspace_id === workspaceId && e.lead_id === leadId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  const rows = ((data ?? []) as LeadEventRow[]).map(rowToLeadEvent);
  
  // Se não houver dados no banco, tentamos o fallback do localStorage
  if (rows.length === 0) {
    const local = readLocalLegacy()
      .filter((e) => e.workspace_id === workspaceId && e.lead_id === leadId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return local;
  }

  return rows;
}

export type RecordLeadEventInput = {
  workspaceId: string;
  leadId: string;
  tipo: LeadEventType;
  modulo?: LeadEventModule;
  status_anterior?: LeadStatus;
  status_novo?: LeadStatus;
  descricao?: string;
  created_by?: string;
  created_by_name?: string;
};

export async function recordLeadEvent(input: RecordLeadEventInput): Promise<LeadEvent> {
  // Prepara o payload para o campo jsonb 'data'
  const eventData = {
    tipo: input.tipo,
    modulo: input.modulo ?? "prospeccao",
    status_anterior: input.status_anterior,
    status_novo: input.status_novo,
    descricao: input.descricao,
    created_by: input.created_by,
    created_by_name: input.created_by_name,
  };

  const { data, error } = await supabase
    .from("lead_events")
    .insert({
      workspace_id: input.workspaceId,
      lead_id: input.leadId,
      data: eventData as Json,
    })
    .select("id, workspace_id, lead_id, data, created_at")
    .single();

  if (error || !data) {
    console.error("[lead-events.service] Erro ao gravar evento:", error);
    throw new Error(error?.message ?? "Não foi possível registrar o evento.");
  }

  // Não gravamos mais no localStorage
  return rowToLeadEvent(data as LeadEventRow);
}
