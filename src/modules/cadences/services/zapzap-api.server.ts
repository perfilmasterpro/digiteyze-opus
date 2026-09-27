/**
 * Cliente server-side da API de envio do ZapZap.
 *
 * Credenciais vêm da config do WORKSPACE (workspace_settings.features.zapzap),
 * com fallback por env. Endpoint público correto: /api/v1/{instanceId}/send/text.
 */

import type { ZapZapConfig } from "@/modules/integrations/zapzap-config.server";
import { getZapZapConfig } from "@/modules/integrations/zapzap-config.server";

function normalizeBrPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // Decide o DDI (55) pelo COMPRIMENTO, não pelo prefixo: um número nacional do
  // DDD 55 (RS) começa com "55" e seria confundido com "já tem DDI". Número
  // nacional = DDD(2) + 8 ou 9 dígitos = 10 ou 11. Com DDI = 12 ou 13.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Envia texto pela API pública do ZapZap usando a config informada.
 * Se `config` não vier, resolve pela do workspace (banco → env).
 */
export async function sendZapZapText(input: {
  phone: string;
  text: string;
  workspaceId?: string;
  config?: ZapZapConfig;
}): Promise<{ status: number; body: unknown }> {
  const cfg = input.config ?? (input.workspaceId ? await getZapZapConfig(input.workspaceId) : null);
  if (!cfg) {
    throw new Error(
      "ZapZap não configurado. Vá em Configurações → Integrações → ZapZap e informe key, secret e instância.",
    );
  }

  const phone = normalizeBrPhone(input.phone);
  if (!phone || phone.length < 12) {
    throw new Error("Lead sem telefone/WhatsApp válido.");
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": cfg.api_key,
    "x-api-secret": cfg.api_secret,
  };
  const payload = JSON.stringify({ number: phone, text: input.text });
  const base = cfg.base_url.replace(/\/$/, "");

  // Endpoint correto primeiro; fallback só se 404 (compat com páginas antigas).
  const paths = [
    `/api/v1/${encodeURIComponent(cfg.instance_id)}/send/text`,
    `/v1/${encodeURIComponent(cfg.instance_id)}/send/text`,
  ];

  const doPost = (path: string) =>
    fetchWithTimeout(`${base}${path}`, { method: "POST", headers, body: payload });

  let response: Response;
  try {
    response = await doPost(paths[0]);
    if (response.status === 404) response = await doPost(paths[1]);
    // 1 retry em erro transitório de rede/servidor (não em 4xx, que é erro do request)
    if (response.status >= 500) response = await doPost(paths[0]);
  } catch (err) {
    // erro de rede/timeout → 1 retry
    response = await doPost(paths[0]).catch(() => {
      throw new Error(
        `Falha de rede ao falar com o ZapZap: ${err instanceof Error ? err.message : "timeout"}`,
      );
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
      `ZapZap recusou o disparo (HTTP ${response.status})${detail ? `: ${detail.slice(0, 400)}` : "."}`,
    );
  }

  return { status: response.status, body };
}
