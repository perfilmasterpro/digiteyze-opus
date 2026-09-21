/**
 * Executor automático de etapas vencidas de cadências (server-only).
 *
 * Roda a partir do endpoint de cron (`/api/public/cron/cadences-runner`).
 * Para cada vínculo lead × cadência com status "ativa" e data_proxima_acao
 * já vencida: avança a etapa, monta a mensagem do template e dispara no mesmo
 * webhook do ZapZap Flow já usado pelo disparo manual.
 */

import { applyVariables } from "@/modules/message-templates/services/apply-variables";
import type { Lead } from "@/modules/prospeccao/types/leads.types";

type RunnerResult = {
  processadas: number;
  enviadas: number;
  concluidas: number;
  puladas: number;
  falhas: number;
  detalhes: Array<{
    lead_cadence_id: string;
    lead_id: string;
    etapa: number | null;
    resultado: "enviada" | "concluida" | "pulada" | "falha";
    motivo?: string;
  }>;
};

type LeadCadenceRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  cadence_id: string;
  etapa_atual: number;
  status: string;
  data_proxima_acao: string | null;
};

type StepRow = {
  id: string;
  ordem: number;
  nome: string;
  tipo_acao: string;
  template_id: string | null;
  tempo_espera_dias: number;
  descricao: string | null;
};

function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + Math.max(0, days));
  return d.toISOString();
}

function normalizeBrPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Máximo de vínculos processados por execução (protege o worker). */
const BATCH_LIMIT = 50;

export async function runDueCadenceSteps(): Promise<RunnerResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const result: RunnerResult = {
    processadas: 0,
    enviadas: 0,
    concluidas: 0,
    puladas: 0,
    falhas: 0,
    detalhes: [],
  };

  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("lead_cadences")
    .select(
      "id, workspace_id, lead_id, cadence_id, etapa_atual, status, data_proxima_acao",
    )
    .eq("status", "ativa")
    .not("data_proxima_acao", "is", null)
    .lte("data_proxima_acao", nowIso)
    .order("data_proxima_acao", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) throw new Error(error.message);

  const webhookUrl = process.env["ZAPZAP_GROWTH_FLOW_WEBHOOK_URL"]?.trim();

  for (const row of (due ?? []) as LeadCadenceRow[]) {
    result.processadas += 1;
    try {
      const outcome = await processOne(supabaseAdmin, row, webhookUrl);
      result.detalhes.push({
        lead_cadence_id: row.id,
        lead_id: row.lead_id,
        etapa: outcome.etapa,
        resultado: outcome.resultado,
        ...(outcome.motivo ? { motivo: outcome.motivo } : {}),
      });
      if (outcome.resultado === "enviada") result.enviadas += 1;
      if (outcome.resultado === "concluida") result.concluidas += 1;
      if (outcome.resultado === "pulada") result.puladas += 1;
    } catch (err) {
      result.falhas += 1;
      const motivo = err instanceof Error ? err.message : "Erro desconhecido";
      result.detalhes.push({
        lead_cadence_id: row.id,
        lead_id: row.lead_id,
        etapa: row.etapa_atual,
        resultado: "falha",
        motivo,
      });
      await pauseWithError(supabaseAdmin, row, motivo);
    }
  }

  return result;
}

type Outcome = {
  etapa: number | null;
  resultado: "enviada" | "concluida" | "pulada";
  motivo?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processOne(
  admin: any,
  row: LeadCadenceRow,
  webhookUrl: string | undefined,
): Promise<Outcome> {
  const { data: stepsData, error: stepsError } = await admin
    .from("cadence_steps")
    .select("id, ordem, nome, tipo_acao, template_id, tempo_espera_dias, descricao")
    .eq("workspace_id", row.workspace_id)
    .eq("cadence_id", row.cadence_id)
    .order("ordem", { ascending: true });

  if (stepsError) throw new Error(stepsError.message);
  const steps = (stepsData ?? []) as StepRow[];

  const currentStep = steps.find((s) => s.ordem === row.etapa_atual) ?? null;
  const nextOrdem = row.etapa_atual + 1;
  const nextStep = steps.find((s) => s.ordem === nextOrdem) ?? null;
  const nowIso = new Date().toISOString();

  // Sem próxima etapa → cadência concluída
  if (!nextStep) {
    await admin
      .from("lead_cadences")
      .update({
        status: "concluida",
        proxima_acao: null,
        data_proxima_acao: null,
      })
      .eq("id", row.id);

    await recordEvent(
      admin,
      row,
      `Cadência concluída automaticamente — última etapa: ${currentStep?.nome ?? "—"}`,
    );
    return { etapa: row.etapa_atual, resultado: "concluida" };
  }

  // Avança a etapa
  const proxima = addDaysIso(nowIso, nextStep.tempo_espera_dias);
  const { error: updError } = await admin
    .from("lead_cadences")
    .update({
      etapa_atual: nextOrdem,
      status: "ativa",
      proxima_acao: nextStep.nome,
      data_proxima_acao: proxima,
    })
    .eq("id", row.id);
  if (updError) throw new Error(updError.message);

  await recordEvent(
    admin,
    row,
    `Etapa avançada automaticamente — ${currentStep?.nome ?? "—"} → ${nextStep.nome}`,
  );

  // Etapas de espera não geram disparo
  if (nextStep.tipo_acao === "espera") {
    return { etapa: nextOrdem, resultado: "pulada", motivo: "etapa de espera" };
  }

  if (!webhookUrl) {
    throw new Error("Webhook do ZapZap Flow não configurado.");
  }

  // Lead
  const { data: leadRow, error: leadError } = await admin
    .from("leads")
    .select("id, workspace_id, empresa_id, data")
    .eq("workspace_id", row.workspace_id)
    .eq("id", row.lead_id)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!leadRow) throw new Error("Lead não encontrado.");

  const lead = {
    ...((leadRow.data ?? {}) as Record<string, unknown>),
    id: leadRow.id,
    workspace_id: leadRow.workspace_id,
  } as unknown as Lead;

  const phone = normalizeBrPhone(
    (lead.whatsapp as string | undefined) ?? (lead.telefone as string | undefined) ?? "",
  );
  if (!phone || phone.length < 12) {
    throw new Error("Lead sem telefone/WhatsApp válido.");
  }

  // Mensagem da etapa
  if (!nextStep.template_id) {
    throw new Error(
      `A etapa "${nextStep.nome}" não possui mensagem configurada.`,
    );
  }

  const { data: template, error: templateError } = await admin
    .from("message_templates")
    .select("id, corpo")
    .eq("workspace_id", row.workspace_id)
    .eq("id", nextStep.template_id)
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);

  const corpo = (template?.corpo ?? "").trim();
  if (!corpo) {
    throw new Error(
      `A etapa "${nextStep.nome}" não possui mensagem configurada.`,
    );
  }

  const { text } = applyVariables(corpo, { lead });
  const mensagem = text.trim();
  if (!mensagem) {
    throw new Error(`A etapa "${nextStep.nome}" gerou uma mensagem vazia.`);
  }

  const payload = {
    source: "growth_os",
    event: "prospecting.cadence.started",
    workspace_id: row.workspace_id,
    lead_id: row.lead_id,
    cadence_id: row.cadence_id,
    lead_cadence_id: row.id,
    etapa: nextOrdem,
    user_id: null,
    data: {
      customer: {
        phone,
        name: (lead.contato_nome as string | undefined) ?? lead.nome_empresa ?? null,
        company: lead.nome_empresa ?? null,
      },
      step: { ordem: nextOrdem, nome: nextStep.nome },
      message: mensagem,
      mensagem,
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`ZapZap Flow recusou o disparo (HTTP ${response.status}).`);
  }

  await recordEvent(
    admin,
    row,
    `Etapa ${nextOrdem} (${nextStep.nome}) enviada automaticamente ao ZapZap`,
  );

  return { etapa: nextOrdem, resultado: "enviada" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordEvent(admin: any, row: LeadCadenceRow, descricao: string) {
  try {
    await admin.from("lead_events").insert({
      workspace_id: row.workspace_id,
      lead_id: row.lead_id,
      data: { tipo: "updated", modulo: "prospeccao", descricao },
    });
  } catch {
    // auditoria não pode interromper o processamento
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pauseWithError(admin: any, row: LeadCadenceRow, motivo: string) {
  try {
    await admin
      .from("lead_cadences")
      .update({ status: "pausada" })
      .eq("id", row.id);
    await recordEvent(
      admin,
      row,
      `Cadência pausada automaticamente: falha ao executar a etapa — ${motivo}`,
    );
  } catch {
    // ignora
  }
}
