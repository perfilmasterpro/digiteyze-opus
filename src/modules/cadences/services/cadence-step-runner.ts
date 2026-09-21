/**
 * Execução de uma etapa de cadência.
 *
 * Lógica reutilizável usada tanto no início da cadência (Etapa 1) quanto no
 * avanço para as etapas seguintes. Resolve lead + etapa + template, renderiza
 * a mensagem e dispara o evento para o mesmo webhook do ZapZap já em uso
 * (`/api/prospeccao/zapzap-flow`).
 */

import { supabase } from "@/integrations/supabase/client";

import { getLead } from "@/modules/prospeccao/services/leads.service";
import { recordLeadEvent } from "@/modules/prospeccao/services/lead-events.service";
import { getTemplate } from "@/modules/message-templates/services/message-templates.service";
import { applyVariables } from "@/modules/message-templates/services/apply-variables";

import { listCadenceSteps } from "./cadences.service";
import type { CadenceStep, LeadCadence } from "../types/cadences.types";

export type ExecuteCadenceStepResult = {
  etapa: number;
  step: CadenceStep | null;
  mensagem: string | null;
  skipped: boolean;
};

/**
 * Erro de execução de etapa. `dispatched` indica se o disparo chegou a ser feito.
 */
export class CadenceStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CadenceStepError";
  }
}

function resolvePhone(lead: any): string {
  const raw =
    (typeof lead?.whatsapp === "string" && lead.whatsapp.trim()) ||
    (typeof lead?.telefone === "string" && lead.telefone.trim()) ||
    "";
  return raw;
}

/**
 * Executa a etapa atual de um vínculo lead × cadência e dispara ao ZapZap.
 *
 * Etapas do tipo "espera" são ignoradas (não geram disparo).
 * Etapas de mensagem sem template/corpo configurado lançam erro claro.
 */
export async function executeCadenceStep(
  workspaceId: string,
  leadId: string,
  leadCadence: LeadCadence,
): Promise<ExecuteCadenceStepResult> {
  const etapa = leadCadence.etapa_atual;

  const steps = await listCadenceSteps(workspaceId, leadCadence.cadence_id);
  const step = steps.find((s) => s.ordem === etapa) ?? null;

  if (!step) {
    throw new CadenceStepError(
      `Etapa ${etapa} não encontrada na cadência configurada.`,
    );
  }

  if (step.tipo_acao === "espera") {
    return { etapa, step, mensagem: null, skipped: true };
  }

  const lead = await getLead(workspaceId, leadId);
  if (!lead) throw new CadenceStepError("Lead não encontrado.");

  const phone = resolvePhone(lead);
  if (!phone) {
    throw new CadenceStepError("Lead sem telefone/WhatsApp válido.");
  }

  // Mensagem configurada para a etapa (Biblioteca de Mensagens)
  if (!step.template_id) {
    throw new CadenceStepError(
      `A etapa "${step.nome}" não possui mensagem configurada. Vincule um template antes de executá-la.`,
    );
  }

  const template = await getTemplate(workspaceId, step.template_id);
  const corpo = template?.corpo?.trim() ?? "";
  if (!corpo) {
    throw new CadenceStepError(
      `A etapa "${step.nome}" não possui mensagem configurada. Vincule um template antes de executá-la.`,
    );
  }

  const { text } = applyVariables(corpo, { lead: lead as any });
  const mensagem = text.trim();
  if (!mensagem) {
    throw new CadenceStepError(
      `A etapa "${step.nome}" gerou uma mensagem vazia. Revise o template antes de executá-la.`,
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new CadenceStepError("Sua sessão expirou. Faça login novamente.");
  }

  const response = await fetch("/api/prospeccao/zapzap-flow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      lead_id: leadId,
      empresa: (lead as any).nome_empresa ?? (lead as any).empresa,
      nome: (lead as any).contato_nome ?? (lead as any).nome_empresa,
      telefone: (lead as any).telefone,
      whatsapp: (lead as any).whatsapp,
      cadence_id: leadCadence.cadence_id,
      lead_cadence_id: leadCadence.id,
      etapa,
      etapa_nome: step.nome,
      mensagem,
    }),
  });

  if (!response.ok) {
    let message = "Não foi possível enviar a etapa pelo Flow do ZapZap.";
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") message = payload.error;
    } catch {
      // mantém a mensagem padrão
    }
    throw new CadenceStepError(message);
  }

  return { etapa, step, mensagem, skipped: false };
}

/** Registra na timeline do lead a falha de execução da etapa. */
export async function recordCadenceStepFailure(
  workspaceId: string,
  leadId: string,
  etapa: number,
  motivo: string,
): Promise<void> {
  try {
    await recordLeadEvent({
      workspaceId,
      leadId,
      tipo: "updated",
      descricao: `Falha ao executar a etapa ${etapa} da cadência: ${motivo}`,
    });
  } catch {
    // registro de auditoria não deve mascarar o erro original
  }
}

/** Registra na timeline do lead a execução bem-sucedida da etapa. */
export async function recordCadenceStepSuccess(
  workspaceId: string,
  leadId: string,
  etapa: number,
  stepNome: string,
): Promise<void> {
  try {
    await recordLeadEvent({
      workspaceId,
      leadId,
      tipo: "updated",
      descricao: `Etapa ${etapa} (${stepNome}) enviada ao ZapZap`,
    });
  } catch {
    // silencioso
  }
}
