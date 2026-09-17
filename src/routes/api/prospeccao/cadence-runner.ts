import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { applyVariables } from "@/modules/message-templates/services/apply-variables";
import { recordOutgoingWhatsAppInteraction, sendZapZapText } from "@/modules/zapzap/zapzap.service";

const DAILY_LIMIT = Math.max(1, Number(process.env.PROSPECCAO_DAILY_LIMIT ?? "10"));
const BATCH_LIMIT = 1;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function startOfBrazilDayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00-03:00`).toISOString();
}

async function countTodayOutgoing(workspaceId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("lead_interactions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .filter("data->>tipo", "eq", "whatsapp")
    .filter("data->>direcao", "eq", "outgoing")
    .gte("created_at", startOfBrazilDayIso());
  if (error) throw error;
  return count ?? 0;
}

async function getLead(workspaceId: string, leadId: string) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id, workspace_id, empresa_id, data, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...(data.data as Record<string, unknown>),
    id: data.id,
    workspace_id: data.workspace_id,
    empresa_id: data.empresa_id ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as any;
}

async function getStep(workspaceId: string, cadenceId: string, ordem: number) {
  const { data, error } = await supabaseAdmin
    .from("cadence_steps")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("cadence_id", cadenceId)
    .eq("ordem", ordem)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTemplate(workspaceId: string, templateId: string) {
  const { data, error } = await supabaseAdmin
    .from("message_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function recordEvent(workspaceId: string, leadId: string, descricao: string) {
  await supabaseAdmin.from("lead_events").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    data: { tipo: "interaction_added", modulo: "prospeccao", descricao },
  });
}

async function advanceCadence(workspaceId: string, leadId: string, leadCadence: any) {
  const { data: nextStep, error: nextError } = await supabaseAdmin
    .from("cadence_steps")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("cadence_id", leadCadence.cadence_id)
    .eq("ordem", Number(leadCadence.etapa_atual) + 1)
    .maybeSingle();
  if (nextError) throw nextError;

  if (!nextStep) {
    const { error } = await supabaseAdmin
      .from("lead_cadences")
      .update({ status: "concluida", proxima_acao: null, data_proxima_acao: null })
      .eq("workspace_id", workspaceId)
      .eq("id", leadCadence.id);
    if (error) throw error;
    return;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + Math.max(0, Number(nextStep.tempo_espera_dias ?? 0)));

  const { error: updateError } = await supabaseAdmin
    .from("lead_cadences")
    .update({
      etapa_atual: nextStep.ordem,
      status: "ativa",
      proxima_acao: nextStep.nome,
      data_proxima_acao: nextDate.toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", leadCadence.id);
  if (updateError) throw updateError;

  if (nextStep.tipo_acao !== "espera") {
    await supabaseAdmin.from("tasks").insert({
      workspace_id: workspaceId,
      criado_por: null,
      responsavel_id: null,
      titulo: `${nextStep.nome}${nextStep.descricao ? ` — ${nextStep.descricao}` : ""}`,
      categoria: "comercial",
      status: "pendente",
      prioridade: "media",
      origem: "lead",
      origem_ref_tipo: "lead",
      origem_ref_id: leadId,
      modulo_relacionado: "prospeccao",
      data: nextDate.toISOString().slice(0, 10),
      prazo: nextDate.toISOString().slice(0, 10),
    });
  }
}

async function executeOne(workspaceId: string, leadCadence: any) {
  const lead = await getLead(workspaceId, leadCadence.lead_id);
  if (!lead) throw new Error("Lead não encontrado");

  if (["respondeu", "reuniao", "proposta", "negociacao", "cliente", "perdido"].includes(lead.status)) {
    return { skipped: true, reason: `Lead em estágio ${lead.status}` };
  }

  const step = await getStep(workspaceId, leadCadence.cadence_id, leadCadence.etapa_atual);
  if (!step) throw new Error("Etapa da cadência não encontrada");
  if (step.tipo_acao !== "mensagem") return { skipped: true, reason: `Etapa ${step.ordem} não é mensagem` };
  if (!step.template_id) throw new Error("Etapa de mensagem sem template vinculado");

  const template = await getTemplate(workspaceId, step.template_id);
  if (!template || !template.ativo) throw new Error("Template inexistente ou inativo");

  const rendered = applyVariables(template.corpo, { lead });
  if (rendered.missing.length) throw new Error(`Variáveis não preenchidas: ${rendered.missing.join(", ")}`);

  const number = String(lead.whatsapp ?? lead.telefone ?? "").replace(/\D/g, "");
  if (!number) throw new Error("Lead sem telefone/WhatsApp válido");

  const send = await sendZapZapText({ number, text: rendered.text, delay: 1200, digitando: true });

  await recordOutgoingWhatsAppInteraction({
    workspaceId,
    leadId: lead.id,
    number,
    text: rendered.text,
    messageId: send.messageId,
  });

  await recordEvent(workspaceId, lead.id, `WhatsApp enviado automaticamente — ${step.nome}`);
  await advanceCadence(workspaceId, lead.id, leadCadence);

  return { skipped: false, leadId: lead.id, messageId: send.messageId, step: step.nome };
}

export const Route = createFileRoute("/api/prospeccao/cadence-runner")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

        try {
          const workspaceId = process.env.ZAPZAP_WORKSPACE_ID;
          if (!workspaceId) throw new Error("ZAPZAP_WORKSPACE_ID não configurado");

          const sentToday = await countTodayOutgoing(workspaceId);
          if (sentToday >= DAILY_LIMIT) {
            return Response.json({ ok: true, sent: 0, sentToday, dailyLimit: DAILY_LIMIT, reason: "daily_limit" });
          }

          const { data, error } = await supabaseAdmin
            .from("lead_cadences")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("status", "ativa")
            .lte("data_proxima_acao", new Date().toISOString())
            .order("data_proxima_acao", { ascending: true })
            .limit(BATCH_LIMIT);
          if (error) throw error;

          const results: any[] = [];
          for (const item of data ?? []) {
            try {
              results.push(await executeOne(workspaceId, item));
            } catch (error) {
              const message = error instanceof Error ? error.message : "Erro desconhecido";
              results.push({ leadId: item.lead_id, error: message });
              await recordEvent(workspaceId, item.lead_id, `Falha no envio automático da cadência: ${message}`).catch(() => undefined);
            }
          }

          return Response.json({ ok: true, sent: results.filter((result) => result.messageId).length, sentToday, dailyLimit: DAILY_LIMIT, results });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro interno";
          console.error("[cadence-runner]", error);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
