/**
 * Service do domínio Cadências Comerciais (Supabase).
 * Escopo por workspace_id + RLS.
 */

import { supabase } from "@/integrations/supabase/client";

import type {
  Cadence,
  CadenceInput,
  CadenceStep,
  CadenceStepInput,
  CadenceWithSteps,
} from "../types/cadences.types";

export async function listCadences(workspaceId: string): Promise<Cadence[]> {
  const { data, error } = await supabase
    .from("cadences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Cadence[];
}

export async function listCadenceSteps(
  workspaceId: string,
  cadenceId: string,
): Promise<CadenceStep[]> {
  const { data, error } = await supabase
    .from("cadence_steps")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("cadence_id", cadenceId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CadenceStep[];
}

export async function getCadenceWithSteps(
  workspaceId: string,
  cadenceId: string,
): Promise<CadenceWithSteps | null> {
  const { data: cadence, error } = await supabase
    .from("cadences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", cadenceId)
    .maybeSingle();
  if (error) throw error;
  if (!cadence) return null;
  const steps = await listCadenceSteps(workspaceId, cadenceId);
  return { ...(cadence as Cadence), steps };
}

async function replaceSteps(
  workspaceId: string,
  cadenceId: string,
  steps: CadenceStepInput[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from("cadence_steps")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("cadence_id", cadenceId);
  if (delErr) throw delErr;
  if (steps.length === 0) return;
  const rows = steps.map((s, i) => ({
    workspace_id: workspaceId,
    cadence_id: cadenceId,
    ordem: i + 1,
    nome: s.nome,
    categoria_id: s.categoria_id ?? null,
    template_id: s.template_id ?? null,
    tipo_acao: s.tipo_acao,
    tempo_espera_dias: s.tempo_espera_dias,
    descricao: s.descricao ?? null,
  }));
  const { error: insErr } = await supabase.from("cadence_steps").insert(rows);
  if (insErr) throw insErr;
}

export async function createCadence(
  workspaceId: string,
  userId: string,
  input: CadenceInput,
): Promise<Cadence> {
  const { data, error } = await supabase
    .from("cadences")
    .insert({
      workspace_id: workspaceId,
      nome: input.nome,
      descricao: input.descricao ?? null,
      status: input.status,
      criado_por: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  const cadence = data as Cadence;
  await replaceSteps(workspaceId, cadence.id, input.steps);
  return cadence;
}

export async function updateCadence(
  workspaceId: string,
  id: string,
  input: CadenceInput,
): Promise<Cadence> {
  const { data, error } = await supabase
    .from("cadences")
    .update({
      nome: input.nome,
      descricao: input.descricao ?? null,
      status: input.status,
    })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await replaceSteps(workspaceId, id, input.steps);
  return data as Cadence;
}

export async function deleteCadence(workspaceId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("cadences")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}
