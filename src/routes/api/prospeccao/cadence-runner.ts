import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTemplate } from "@/modules/message-templates/services/message-templates.service";
import { applyVariables } from "@/modules/message-templates/services/apply-variables";
import { getLead } from "@/modules/prospeccao/services/leads.service";
import { recordLeadEvent } from "@/modules/prospeccao/services/lead-events.service";
import { advanceLeadCadence } from "@/modules/cadences/services/lead-cadences.service";
import { listCadenceSteps } from "@/modules/cadences/services/cadences.service";
import { recordOutgoingWhatsAppInteraction, sendZapZapText } from "@/modules/zapzap/zapzap.service";

const DAILY_LIMIT = Math.max(1, Number(process.env.PROSPECCAO_DAILY_LIMIT ?? "10"));
const BATCH_LIMIT = 1;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
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

async function executeOne(workspaceId: string, leadCadence: any) {
  const lead = await getLead(workspaceId, leadCadence.lead_id);
  if (!lead) throw new Error("Lead não encontrado");

  const steps = await listCadenceSteps(workspaceId, leadCadence.cadence_id);
  const step = steps.find((item) => item.ordem === leadCadence.etapa_atual);
  if (!step) throw new Error("Etapa da cadência não encontrada");

  if (step.tipo_acao !== "mensagem") {
    return { skipped: true, reason: `Etapa ${step.ordem} não é mensagem` };
  }

  if (["respondeu", "reuniao", "proposta", "negociacao", "cliente", "perdido"].includes(lead.status)) {
    return { skipped: true, reason: `Lead em estágio ${lead.status}` };
  }

  if (!lead.whatsapp && !lead.telefone) {
    throw new Error("Lead sem telefone/WhatsApp");
  }

  if (!step.template_id) {
    throw new Error("Etapa de mensagem sem template vinculado");
  }

  const template = await getTemplate(workspaceId, step.template_id);
  if (!template || !template.ativo) {
    throw new Error("Template inexistente ou inativo");
  }

  const rendered = applyVariables(template.corpo, { lead });
  if (rendered.missing.length) {
    throw new Error(`Variáveis não preenchidas: ${rendered.missing.join(", ")}`);
  }

  const number = String(lead.whatsapp ?? lead.telefone ?? "").replace(/\D/g, "");
  if (!number) throw new Error("Telefone inválido");

  const send = await sendZapZapText({
    number,
    text: rendered.text,
    delay: 1200,
    digitando: true,
  });

  await recordOutgoingWhatsAppInteraction({
    workspaceId,
    leadId: lead.id,
    number,
    text: rendered.text,
    messageId: send.messageId,
  });

  await recordLeadEvent({
    workspaceId,
    leadId: lead.id,
    tipo: "interaction_added",
    descricao: `WhatsApp enviado automaticamente — ${step.nome}`,
  });

  await advanceLeadCadence(workspaceId, lead.id, leadCadence.id);

  return {
    skipped: false,
    leadId: lead.id,
    messageId: send.messageId,
    step: step.nome,
  };
}

export const Route = createFileRoute("/api/prospeccao/cadence-runner")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

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

          const results = [];
          for (const item of data ?? []) {
            try {
              results.push(await executeOne(workspaceId, item));
            } catch (error) {
              const message = error instanceof Error ? error.message : "Erro desconhecido";
              results.push({ leadId: item.lead_id, error: message });
              await recordLeadEvent({
                workspaceId,
                leadId: item.lead_id,
                tipo: "updated",
                descricao: `Falha no envio automático da cadência: ${message}`,
              }).catch(() => undefined);
            }
          }

          return Response.json({
            ok: true,
            sent: results.filter((result) => "messageId" in result).length,
            sentToday,
            dailyLimit: DAILY_LIMIT,
            results,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro interno";
          console.error("[cadence-runner]", error);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
