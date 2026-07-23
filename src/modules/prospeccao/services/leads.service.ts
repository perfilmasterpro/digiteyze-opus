import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";


import type { Lead, LeadInput, LeadStatus } from "../types/leads.types";

/**
 * Service do domínio Prospecção (Leads).
 *
 * Fonte primária: tabela `public.leads` (Supabase) — coluna `data` (jsonb)
 * armazena os campos do domínio; `id`, `workspace_id`, `empresa_id`,
 * `created_at`, `updated_at` são colunas físicas.
 *
 * Fallback temporário: `localStorage` (`growth-os:leads`) — usado somente
 * quando a tabela do workspace estiver vazia, para dar continuidade a
 * usuários que ainda não migraram. Será removido após validação.
 */

const STORAGE_KEY = "growth-os:leads";

/* ─────────────────── Fallback localStorage (legado) ─────────────────── */

function isBrowser() {
  return typeof window !== "undefined";
}

function readLocal(): Lead[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Lead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ─────────────────── Mapeamento row ↔ domínio ─────────────────── */

type LeadRow = {
  id: string;
  workspace_id: string;
  empresa_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function rowToLead(row: LeadRow): Lead {
  const d = (row.data ?? {}) as Record<string, unknown>;
  // `data` guarda todos os campos do domínio (nome_empresa, status, origem,
  // responsavel, contatos, custom_fields, aliases legados etc). As colunas
  // físicas prevalecem para os metadados de identidade / relacionamento.
  return {
    ...(d as unknown as Lead),
    id: row.id,
    workspace_id: row.workspace_id,
    empresa_id: row.empresa_id ?? (d.empresa_id as string | undefined),
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Lead;
}

/**
 * Constrói o payload `data` (jsonb) mantendo os aliases que a Central e o
 * agregador (`central-aggregator.ts`) esperam encontrar: `empresa`, `nome`,
 * `telefone`, `whatsapp`, `email`, `status`.
 */
function inputToData(input: LeadInput): Record<string, unknown> {
  return {
    ...input,
    // Aliases de compatibilidade — mantêm a Central funcionando sem alterar
    // consumidores que já leem `data.empresa` / `data.status` etc.
    empresa: input.nome_empresa,
    nome: input.nome_empresa,
    telefone: input.telefone,
    whatsapp: input.whatsapp,
    email: input.contato_email,
    status: input.status,
  };
}

/* ─────────────────── API pública ─────────────────── */

export async function listLeads(workspaceId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, workspace_id, empresa_id, data, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    // Se o Supabase falhar, ainda tentamos o fallback local para não
    // deixar o usuário sem dados durante a transição.
    console.warn("[leads.service] Falha ao ler Supabase, usando fallback local:", error.message);
    return readLocal().filter((l) => l.workspace_id === workspaceId);
  }

  const rows = ((data ?? []) as LeadRow[]).map(rowToLead);
  if (rows.length > 0) return rows;

  // Fallback temporário: workspace vazio no banco → tenta localStorage.
  return readLocal().filter((l) => l.workspace_id === workspaceId);
}

export async function getLead(workspaceId: string, id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, workspace_id, empresa_id, data, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.warn("[leads.service] Falha ao ler lead do Supabase:", error.message);
  }
  if (data) return rowToLead(data as LeadRow);

  // Fallback: procura no localStorage (IDs legados não são UUID).
  const local = readLocal().find((l) => l.id === id && l.workspace_id === workspaceId);
  return local ?? null;
}

export async function createLead(workspaceId: string, input: LeadInput): Promise<Lead> {
  const payload = {
    workspace_id: workspaceId,
    empresa_id: input.empresa_id ?? null,
    data: inputToData(input),
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id, workspace_id, empresa_id, data, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Não foi possível criar o lead.");
  }
  return rowToLead(data as LeadRow);
}

export async function updateLead(
  workspaceId: string,
  id: string,
  input: LeadInput,
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({
      empresa_id: input.empresa_id ?? null,
      data: inputToData(input),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("id, workspace_id, empresa_id, data, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Lead não encontrado");
  }
  return rowToLead(data as LeadRow);
}

export async function updateLeadStatus(
  workspaceId: string,
  id: string,
  status: LeadStatus,
): Promise<Lead> {
  // Lê o registro atual para preservar todos os demais campos dentro de `data`.
  const current = await getLead(workspaceId, id);
  if (!current) throw new Error("Lead não encontrado");

  const nextData = {
    ...(current as unknown as Record<string, unknown>),
    status,
  };
  // Remove metadados que não pertencem ao jsonb.
  delete (nextData as Record<string, unknown>).id;
  delete (nextData as Record<string, unknown>).workspace_id;
  delete (nextData as Record<string, unknown>).empresa_id;
  delete (nextData as Record<string, unknown>).created_at;
  delete (nextData as Record<string, unknown>).updated_at;

  const { data, error } = await supabase
    .from("leads")
    .update({
      data: nextData,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("id, workspace_id, empresa_id, data, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Lead não encontrado");
  }
  return rowToLead(data as LeadRow);
}
