import { createLeadInteraction } from "@/modules/prospeccao/services/lead-interactions.service";

const API_BASE_URL = process.env.ZAPZAP_API_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.ZAPZAP_API_KEY;
const API_SECRET = process.env.ZAPZAP_API_SECRET;
const INSTANCE_ID = process.env.ZAPZAP_INSTANCE_ID;

function requireConfig() {
  const missing = [
    !API_BASE_URL && "ZAPZAP_API_BASE_URL",
    !API_KEY && "ZAPZAP_API_KEY",
    !API_SECRET && "ZAPZAP_API_SECRET",
    !INSTANCE_ID && "ZAPZAP_INSTANCE_ID",
  ].filter(Boolean) as string[];

  if (missing.length) throw new Error(`Configuração ZapZap incompleta: ${missing.join(", ")}`);
}

export type ZapZapSendResult = { messageId: string; status: string };

export async function sendZapZapText(input: {
  number: string;
  text: string;
  delay?: number;
  replyid?: string;
  digitando?: boolean;
}): Promise<ZapZapSendResult> {
  requireConfig();

  const response = await fetch(`${API_BASE_URL}/api/v1/${INSTANCE_ID}/send/text`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY!,
      "x-api-secret": API_SECRET!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: input.number,
      text: input.text,
      delay: input.delay ?? 1200,
      replyid: input.replyid,
      digitando: input.digitando ?? true,
    }),
  });

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    throw new Error(`ZapZap ${response.status}: ${typeof data === "object" && data ? JSON.stringify(data) : raw}`);
  }

  const result = data as Partial<ZapZapSendResult> | null;
  if (!result?.messageId || !result.status) throw new Error("ZapZap retornou resposta sem messageId/status.");
  return { messageId: result.messageId, status: result.status };
}

export async function recordOutgoingWhatsAppInteraction(input: {
  workspaceId: string;
  leadId: string;
  number: string;
  text: string;
  messageId: string;
  instanceId?: string;
}) {
  return createLeadInteraction(
    input.workspaceId,
    input.leadId,
    {
      tipo: "whatsapp",
      descricao: input.text,
      payload: {
        tipo: "whatsapp",
        direcao: "outgoing",
        message_id: input.messageId,
        sender_phone: process.env.ZAPZAP_SENDER_PHONE,
        receiver_phone: input.number,
        instance_id: input.instanceId ?? INSTANCE_ID,
        provider: "zapzap",
        mensagem: input.text,
        timestamp_whatsapp: new Date().toISOString(),
        metadata: { source: "cadence_executor" },
      },
    },
    true,
  );
}
