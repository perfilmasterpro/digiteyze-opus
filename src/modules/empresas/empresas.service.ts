import { supabase } from "@/integrations/supabase/client";
import { getCurrentWorkspaceId } from "@/lib/workspace";

import type { Empresa, EmpresaInput, EmpresaStatus } from "./empresas.types";

/**
 * Service do domínio Empresas — persistência em Supabase (tabela `empresas`).
 *
 * Estratégia: a tabela usa uma coluna JSONB `data` para armazenar todos os
 * campos de domínio; `workspace_id`, `id`, `created_at` e `updated_at` são
 * colunas relacionais. Isso mantém as assinaturas Zod estáveis enquanto o
 * schema evolui.
 *
 * RLS: `is_workspace_member(workspace_id)` — todas as consultas respeitam
 * automaticamente o isolamento por workspace do usuário autenticado.
 */

type EmpresaRow = {
  id: string;
  workspace_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function rowToEmpresa(row: EmpresaRow): Empresa {
  const d = (row.data ?? {}) as Partial<Empresa>;
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    nome: d.nome ?? "",
    tipo: d.tipo ?? "outro",
    status: d.status ?? "ativo",
    responsavel: d.responsavel ?? "",
    origem: d.origem ?? "outro",
    documento: d.documento,
    site: d.site,
    email: d.email,
    telefone: d.telefone,
    segmento: d.segmento,
    cidade: d.cidade,
    estado: d.estado,
    observacoes: d.observacoes,
    lead_origem_id: d.lead_origem_id,
    data_conversao: d.data_conversao,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Empresa;
}

export async function listEmpresas(): Promise<Empresa[]> {
  const workspaceId = getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, workspace_id, data, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToEmpresa(r as EmpresaRow));
}

export async function getEmpresa(id: string): Promise<Empresa | null> {
  const workspaceId = getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, workspace_id, data, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToEmpresa(data as EmpresaRow) : null;
}

export async function createEmpresa(input: EmpresaInput): Promise<Empresa> {
  const workspaceId = getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("empresas")
    .insert({ workspace_id: workspaceId, data: input as unknown as Record<string, unknown> })
    .select("id, workspace_id, data, created_at, updated_at")
    .single();
  if (error) throw error;
  return rowToEmpresa(data as EmpresaRow);
}

export async function updateEmpresa(id: string, input: EmpresaInput): Promise<Empresa> {
  const workspaceId = getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("empresas")
    .update({ data: input as unknown as Record<string, unknown> })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("id, workspace_id, data, created_at, updated_at")
    .single();
  if (error) throw error;
  return rowToEmpresa(data as EmpresaRow);
}

export async function archiveEmpresa(id: string): Promise<Empresa> {
  return setEmpresaStatus(id, "arquivado");
}

export async function reactivateEmpresa(id: string): Promise<Empresa> {
  return setEmpresaStatus(id, "ativo");
}

export async function deleteEmpresa(id: string): Promise<void> {
  const workspaceId = getCurrentWorkspaceId();
  const { error } = await supabase
    .from("empresas")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

async function setEmpresaStatus(id: string, status: EmpresaStatus): Promise<Empresa> {
  const current = await getEmpresa(id);
  if (!current) throw new Error("Empresa não encontrada");
  const next: EmpresaInput = {
    nome: current.nome,
    tipo: current.tipo,
    status,
    responsavel: current.responsavel,
    origem: current.origem,
    documento: current.documento,
    site: current.site,
    email: current.email,
    telefone: current.telefone,
    segmento: current.segmento,
    cidade: current.cidade,
    estado: current.estado,
    observacoes: current.observacoes,
    lead_origem_id: current.lead_origem_id,
    data_conversao: current.data_conversao,
  };
  return updateEmpresa(id, next);
}
