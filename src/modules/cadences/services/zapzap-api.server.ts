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

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "x-api-secret": apiSecret,
  };

  const payload = JSON.stringify({
    number: phone,
    text: input.text,
  });

  // A documentação pública atual usa /v1, mas algumas páginas de integração
  // da própria ZapZap ainda exibem /api/v1. Se o primeiro endpoint responder
  // 404, tentamos a variante compatível sem duplicar envios aceitos.
  const paths = [
    `/v1/${encodeURIComponent(instanceId)}/send/text`,
    `/api/v1/${encodeURIComponent(instanceId)}/send/text`,
  ];

  let response = await fetch(`${baseUrl}${paths[0]}`, {
    method: "POST",
    headers,
    body: payload,
  });

  if (response.status === 404) {
    response = await fetch(`${baseUrl}${paths[1]}`, {
      method: "POST",
      headers,
      body: payload,
    });
  }

  const responseText = await response.text();
  let body: unknown = null;
  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    body = responseText;
  }

  if (!response.ok) {
    const detail =
      typeof body === "string"
        ? body
        : body && typeof body === "object"
          ? JSON.stringify(body)
          : "";
    throw new Error(
      `ZapZap API recusou o disparo (HTTP ${response.status})${detail ? `: ${detail.slice(0, 500)}` : "."}`,
    );
  }

  return { status: response.status, body };
}
