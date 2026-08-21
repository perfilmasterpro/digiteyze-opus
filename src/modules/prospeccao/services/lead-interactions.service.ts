import { supabase } from "@/integrations/supabase/client";
import type {
  LeadInteraction,
  LeadInteractionInput,
  LeadInteractionPayload,
} from "../types/entities.types";

const STORAGE_KEY = "growth-os:lead-interactions";

function isBrowser() {
  return typeof window !== "undefined";
}

/** 
 * @deprecated Mantido apenas para fallback de leitura de dados legados no localStorage.
 */
function readLegacyLocalStorage(): LeadInteraction[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    if (!Array.isArray(parsed)) return [];
    
    // Normaliza para o novo formato para não quebrar a UI
    return parsed.map(item => ({
      ...item,
      data_json: item.data_json || {
        tipo: item.tipo,
        mensagem: item.descricao,
      }
    }));
  } catch {
    return [];
  }
}

/**
 * Consulta interações de um lead no Supabase com fallback para localStorage.
 */
export async function listLeadInteractions(
  workspaceId: string,
  leadId: string,
): Promise<LeadInteraction[]> {
  const { data: dbData, error } = await supabase
    .from("lead_interactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar interações no Supabase:", error);
    // Em caso de erro no banco, tentamos o legado
    return readLegacyLocalStorage()
      .filter((i) => i.workspace_id === workspaceId && i.lead_id === leadId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  const interactions: LeadInteraction[] = (dbData || []).map((row: any) => ({
    id: row.id,
    workspace_id: row.workspace_id,
    lead_id: row.lead_id,
    tipo: (row.data as any)?.tipo || "nota",
    data: row.created_at, // Fallback para compatibilidade
    descricao: (row.data as any)?.mensagem || "", // Fallback para compatibilidade
    data_json: row.data as LeadInteractionPayload,
    responsavel_id: (row.data as any)?.responsavel_id,
    created_at: row.created_at,
  }));

  return interactions;
}

/**
 * Persiste uma nova interação no Supabase.
 * Implementa idempotência para interações WhatsApp via constraint de banco.
 */
export async function createLeadInteraction(
  workspaceId: string,
  leadId: string,
  input: LeadInteractionInput,
): Promise<LeadInteraction> {
  const payload: LeadInteractionPayload = {
    tipo: input.tipo,
    mensagem: input.descricao,
    responsavel_id: input.responsavel_id,
    ...(input.payload || {}),
  };

  const { data, error } = await supabase
    .from("lead_interactions")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      data: payload as any,
    })
    .select()
    .single();

  if (error) {
    // Tratamento de idempotência (Unique violation no PostgreSQL é código 23505)
    if (error.code === "23505" && payload.message_id) {
      console.warn(`Interação WhatsApp duplicada ignorada: ${payload.message_id}`);
      
      // Busca a interação existente para retornar um resultado consistente
      const { data: existing } = await supabase
        .from("lead_interactions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .filter("data->>message_id", "eq", payload.message_id)
        .single();
        
      if (existing) {
        return {
          id: existing.id,
          workspace_id: existing.workspace_id,
          lead_id: existing.lead_id,
          tipo: (existing.data as any).tipo,
          data: existing.created_at,
          descricao: (existing.data as any).mensagem,
          data_json: existing.data as LeadInteractionPayload,
          responsavel_id: (existing.data as any).responsavel_id,
          created_at: existing.created_at,
        };
      }
    }
    
    throw new Error(`Erro ao criar interação: ${error.message}`);
  }

  return {
    id: data.id,
    workspace_id: data.workspace_id,
    lead_id: data.lead_id,
    tipo: (data.data as any).tipo,
    data: data.created_at,
    descricao: (data.data as any).mensagem,
    data_json: data.data as LeadInteractionPayload,
    responsavel_id: (data.data as any).responsavel_id,
    created_at: data.created_at,
  };
}
