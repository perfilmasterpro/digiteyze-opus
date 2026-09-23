/**
 * Cliente server-side da API de envio do ZapZap.
 *
 * O Growth envia mensagens de saída diretamente pela API REST.
 * Webhooks ficam reservados para eventos de entrada/status.
 */

function normalizeBrPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendZapZapText(input: {
  phone: string;
  text: string;
}): Promise<{ status: number; body: unknown }> {
  const apiKey = process.env.ZAPZAP_API_KEY?.trim();
  const apiSecret = process.env.ZAPZAP_API_SECRET?.trim();
  const instanceId = process.env.ZAPZAP_INSTANCE_ID?.trim();
  const baseUrl = (
    process.env.ZAPZAP_API_BASE_URL?.trim() || "https://api.zapzapapi.com"
  ).replace(/\/$/, "");

  if (!apiKey || !apiSecret || !instanceId) {
    throw new Error(
      "API do ZapZap não configurada. Defina ZAPZAP_API_KEY, ZAPZAP_API_SECRET e ZAPZAP_INSTANCE_ID.",
    );
  }

  const phone = normalizeBrPhone(input.phone);
  if (!phone || phone.length < 12) {
    throw new Error("Lead sem telefone/WhatsApp válido.");
  }

  const response = await fetch(
    `${baseUrl}/v1/${encodeURIComponent(instanceId)}/send/text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
      },
      body: JSON.stringify({
        number: phone,
        text: input.text,
      }),
    },
  );

  const responseText = await response.text();
  let body: unknown = null;
  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    body = responseText;
  }

  if (!response.ok) {
    throw new Error(
      `ZapZap API recusou o disparo (HTTP ${response.status}).`,
    );
  }

  return { status: response.status, body };
}
