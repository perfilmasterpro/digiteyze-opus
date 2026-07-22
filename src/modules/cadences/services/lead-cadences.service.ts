/**
 * Vínculo Lead × Cadência (Supabase). Gerencia execução de cadência para um lead.
 */

import { supabase } from "@/integrations/supabase/client";

import { createLeadTask } from "@/modules/prospeccao/services/lead-tasks.service";
import { recordLeadEvent } from "@/modules/prospeccao/services/lead-events.service";

import { listCadenceSteps } from "./cadences.service";
import type {
  CadenceStep,
  LeadCadence,
  LeadCadenceStatus,
} from "../types/cadences.types";

function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + Math.max(0, days));
  return d.toISOString();
}

export async function listLeadCadences(
  workspaceId: string,
  leadId: string,
): Promise<LeadCadence[]> {
  const { data, error } = await supabase
    .from("lead_cadences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeadCadence[];
}

export async function getActiveLeadCadence(
  workspaceId: string,
  leadId: string,
): Promise<LeadCadence | null> {
  const { data, error } = await supabase
    .from("lead_cadences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .in("status", ["ativa", "pausada"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as LeadCadence | null) ?? null;
}

function stepAt(steps: CadenceStep[], ordem: number): CadenceStep | undefined {
  return steps.find((s) => s.ordem === ordem);
}

export async function startCadenceForLead(
  workspaceId: string,
  leadId: string,
  cadenceId: string,
): Promise<LeadCadence> {
  // Fecha qualquer cadência em execução antes de iniciar nova
  const active = await getActiveLeadCadence(workspaceId, leadId);
  if (active) {
    await supabase
      .from("lead_cadences")
      .update({ status: "concluida" as LeadCadenceStatus })
      .eq("workspace_id", workspaceId)
      .eq("id", active.id);
  }

  const steps = await listCadenceSteps(workspaceId, cadenceId);
  const first = stepAt(steps, 1);
  const nowIso = new Date().toISOString();
  const proxima = first ? addDaysIso(nowIso, first.tempo_espera_dias) : null;

  const { data, error } = await supabase
    .from("lead_cadences")
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      cadence_id: cadenceId,
      etapa_atual: 1,
      status: "ativa" as LeadCadenceStatus,
      proxima_acao: first?.nome ?? null,
      data_inicio: nowIso,
      data_proxima_acao: proxima,
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "note",
    descricao: `Cadência iniciada — ${first?.nome ?? "sem etapa"}`,
  });

  return data as LeadCadence;
}

export async function advanceLeadCadence(
  workspaceId: string,
  leadId: string,
  leadCadenceId: string,
): Promise<LeadCadence> {
  const { data: current, error: e1 } = await supabase
    .from("lead_cadences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", leadCadenceId)
    .single();
  if (e1) throw e1;
  const lc = current as LeadCadence;

  const steps = await listCadenceSteps(workspaceId, lc.cadence_id);
  const currentStep = stepAt(steps, lc.etapa_atual);
  const nextOrdem = lc.etapa_atual + 1;
  const nextStep = stepAt(steps, nextOrdem);

  const nowIso = new Date().toISOString();

  if (!nextStep) {
    // finaliza
    const { data, error } = await supabase
      .from("lead_cadences")
      .update({
        status: "concluida" as LeadCadenceStatus,
        proxima_acao: null,
        data_proxima_acao: null,
      })
      .eq("workspace_id", workspaceId)
      .eq("id", leadCadenceId)
      .select("*")
      .single();
    if (error) throw error;
    await recordLeadEvent({
      workspaceId,
      leadId,
      tipo: "note",
      descricao: `Cadência concluída — última etapa: ${currentStep?.nome ?? "—"}`,
    });
    return data as LeadCadence;
  }

  const proxima = addDaysIso(nowIso, nextStep.tempo_espera_dias);

  const { data, error } = await supabase
    .from("lead_cadences")
    .update({
      etapa_atual: nextOrdem,
      status: "ativa" as LeadCadenceStatus,
      proxima_acao: nextStep.nome,
      data_proxima_acao: proxima,
    })
    .eq("workspace_id", workspaceId)
    .eq("id", leadCadenceId)
    .select("*")
    .single();
  if (error) throw error;

  // Timeline: etapa avançada
  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "note",
    descricao: `Etapa concluída — ${currentStep?.nome ?? "—"} → próxima: ${nextStep.nome}`,
  });

  // Cria tarefa para a próxima etapa (mensagem/tarefa)
  if (nextStep.tipo_acao !== "espera") {
    try {
      await createLeadTask(workspaceId, leadId, {
        titulo: `${nextStep.nome}${nextStep.descricao ? " — " + nextStep.descricao : ""}`,
        data: proxima.slice(0, 10),
        prioridade: "media",
      });
      await recordLeadEvent({
        workspaceId,
        leadId,
        tipo: "task_created",
        descricao: `Próxima ação criada: ${nextStep.nome}`,
      });
    } catch {
      // silencioso — falha em tarefa não impede avanço
    }
  }

  return data as LeadCadence;
}

export async function pauseLeadCadence(
  workspaceId: string,
  leadId: string,
  leadCadenceId: string,
): Promise<LeadCadence> {
  const { data, error } = await supabase
    .from("lead_cadences")
    .update({ status: "pausada" as LeadCadenceStatus })
    .eq("workspace_id", workspaceId)
    .eq("id", leadCadenceId)
    .select("*")
    .single();
  if (error) throw error;
  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "note",
    descricao: "Cadência pausada",
  });
  return data as LeadCadence;
}

export async function resumeLeadCadence(
  workspaceId: string,
  leadId: string,
  leadCadenceId: string,
): Promise<LeadCadence> {
  const { data, error } = await supabase
    .from("lead_cadences")
    .update({ status: "ativa" as LeadCadenceStatus })
    .eq("workspace_id", workspaceId)
    .eq("id", leadCadenceId)
    .select("*")
    .single();
  if (error) throw error;
  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "note",
    descricao: "Cadência retomada",
  });
  return data as LeadCadence;
}

export async function finishLeadCadence(
  workspaceId: string,
  leadId: string,
  leadCadenceId: string,
): Promise<LeadCadence> {
  const { data, error } = await supabase
    .from("lead_cadences")
    .update({
      status: "concluida" as LeadCadenceStatus,
      proxima_acao: null,
      data_proxima_acao: null,
    })
    .eq("workspace_id", workspaceId)
    .eq("id", leadCadenceId)
    .select("*")
    .single();
  if (error) throw error;
  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "note",
    descricao: "Cadência finalizada manualmente",
  });
  return data as LeadCadence;
}
