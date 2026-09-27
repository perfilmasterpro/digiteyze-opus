/**
 * Config server-side da integração ZapZap (por workspace, multi-tenant).
 *
 * Reconstruído a partir das auditorias 2026-09-24 (a camada original era
 * trabalho não-commitado que só sobreviveu no build compilado do Vercel).
 * Comportamentos-fonte (auditoria-codigo-integracao.md):
 *  - getZapZapConfig / getZapZapConfigMasked leem a config do workspace via
 *    `supabaseAdmin`, MAS envolvem o acesso em try/catch: sem
 *    SUPABASE_SERVICE_ROLE_KEY o admin client lança e a leitura cai em
 *    `fromEnv()` (ZAPZAP_API_KEY / API_SECRET / INSTANCE_ID / API_BASE_URL,
 *    default base https://api.zapzapapi.com). É o "Fix 8" (fallback env).
 *  - Masked esconde o segredo (mostra só os últimos dígitos).
 *  - saveZapZapConfig EXIGE service role.
 *  - normalize(): ao editar, campo vazio PRESERVA o valor atual (merge
 *    parcial) — não obriga redigitar key+secret (corrige M3 do audit).
 *
 * SEGURANÇA: este módulo é `.server.ts`; o import top-level do
 * `client.server` (service role) só é seguro aqui — nunca em arquivos que
 * vão para o bundle do cliente.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEFAULT_ZAPZAP_BASE_URL = "https://api.zapzapapi.com";

/** Config resolvida, COM segredos. Uso exclusivamente server-side. */
export type ZapZapConfig = {
  apiKey: string;
  apiSecret: string;
  instanceId: string;
  baseUrl: string;
  webhookSecret: string;
  /** De onde a config veio: linha do workspace (`db`) ou variáveis de ambiente (`env`). */
  source: "db" | "env";
};

/** Config para exibição na UI: sem segredos em claro. */
export type ZapZapConfigMasked = {
  apiKey: string;
  apiSecret: string;
  instanceId: string;
  baseUrl: string;
  /** true se há um webhook_secret configurado (o valor em si nunca é devolvido). */
  hasWebhookSecret: boolean;
  /** true se key + secret + instance estão todos preenchidos (envio funciona). */
  configured: boolean;
  source: "db" | "env";
};

export type ZapZapConfigInput = {
  apiKey?: string | null;
  apiSecret?: string | null;
  instanceId?: string | null;
  baseUrl?: string | null;
  webhookSecret?: string | null;
};

type ConfigRow = {
  api_key: string;
  api_secret: string;
  instance_id: string;
  base_url: string;
  webhook_secret: string;
};

const EMPTY_ROW: ConfigRow = {
  api_key: "",
  api_secret: "",
  instance_id: "",
  base_url: "",
  webhook_secret: "",
};

/** Lê as credenciais do ambiente. Base URL cai no default quando ausente. */
function fromEnv(): ZapZapConfig {
  return {
    apiKey: process.env.ZAPZAP_API_KEY?.trim() ?? "",
    apiSecret: process.env.ZAPZAP_API_SECRET?.trim() ?? "",
    instanceId: process.env.ZAPZAP_INSTANCE_ID?.trim() ?? "",
    baseUrl: (process.env.ZAPZAP_API_BASE_URL?.trim() || DEFAULT_ZAPZAP_BASE_URL).replace(/\/$/, ""),
    webhookSecret: process.env.ZAPZAP_WEBHOOK_SECRET?.trim() ?? "",
    source: "env",
  };
}

function rowToConfig(row: ConfigRow): ZapZapConfig {
  return {
    apiKey: (row.api_key ?? "").trim(),
    apiSecret: (row.api_secret ?? "").trim(),
    instanceId: (row.instance_id ?? "").trim(),
    baseUrl: ((row.base_url ?? "").trim() || DEFAULT_ZAPZAP_BASE_URL).replace(/\/$/, ""),
    webhookSecret: (row.webhook_secret ?? "").trim(),
    source: "db",
  };
}

/** Uma config está "utilizável" para envio quando tem key + secret + instance. */
function isUsable(cfg: Pick<ZapZapConfig, "apiKey" | "apiSecret" | "instanceId">): boolean {
  return Boolean(cfg.apiKey && cfg.apiSecret && cfg.instanceId);
}

/**
 * Lê a linha crua do workspace via service role. Lança se o admin client não
 * puder ser criado (falta SUPABASE_SERVICE_ROLE_KEY) — quem chama decide o
 * fallback. Devolve null quando simplesmente não há linha.
 */
async function readRow(workspaceId: string): Promise<ConfigRow | null> {
  const { data, error } = await supabaseAdmin
    .from("zapzap_config")
    .select("api_key, api_secret, instance_id, base_url, webhook_secret")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ConfigRow | null) ?? null;
}

/**
 * Config resolvida do workspace (COM segredos). Ordem de precedência:
 *   1. Linha do workspace, quando existe e está utilizável (key+secret+instance).
 *   2. Fallback `fromEnv()` — inclusive quando `supabaseAdmin` lança por falta
 *      de service role (try/catch), ou quando não há linha ainda.
 */
export async function getZapZapConfig(workspaceId: string): Promise<ZapZapConfig> {
  try {
    const row = await readRow(workspaceId);
    if (row) {
      const cfg = rowToConfig(row);
      if (isUsable(cfg)) return cfg;
    }
    // Sem linha utilizável → tenta o ambiente.
    return fromEnv();
  } catch {
    // Sem service role (ou erro de leitura) → o ambiente é a fonte.
    return fromEnv();
  }
}

function maskSecret(value: string): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (v.length <= 4) return "•".repeat(v.length);
  return `${"•".repeat(Math.min(8, v.length - 4))}${v.slice(-4)}`;
}

function toMasked(cfg: ZapZapConfig): ZapZapConfigMasked {
  return {
    apiKey: maskSecret(cfg.apiKey),
    apiSecret: maskSecret(cfg.apiSecret),
    instanceId: cfg.instanceId,
    baseUrl: cfg.baseUrl,
    hasWebhookSecret: Boolean(cfg.webhookSecret),
    configured: isUsable(cfg),
    source: cfg.source,
  };
}

/** Config do workspace para a UI, com segredos mascarados. */
export async function getZapZapConfigMasked(workspaceId: string): Promise<ZapZapConfigMasked> {
  const cfg = await getZapZapConfig(workspaceId);
  return toMasked(cfg);
}

/**
 * Merge parcial (M3): cada campo do input só sobrescreve o atual quando vem
 * preenchido. Campo vazio/omitido PRESERVA o valor já salvo — assim a cliente
 * pode trocar só a base_url/instance sem redigitar key e secret.
 * `base_url` vazio é normalizado (sem barra final).
 */
function normalize(current: ConfigRow, input: ZapZapConfigInput): ConfigRow {
  const pick = (next: string | null | undefined, prev: string): string => {
    const trimmed = (next ?? "").trim();
    return trimmed ? trimmed : prev;
  };
  return {
    api_key: pick(input.apiKey, current.api_key),
    api_secret: pick(input.apiSecret, current.api_secret),
    instance_id: pick(input.instanceId, current.instance_id),
    base_url: pick(input.baseUrl, current.base_url).replace(/\/$/, ""),
    webhook_secret: pick(input.webhookSecret, current.webhook_secret),
  };
}

/**
 * Salva (upsert) a config do workspace. EXIGE service role: se o
 * `supabaseAdmin` não puder ser criado, o acesso lança e o erro sobe para a
 * rota (que responde 500). Aplica merge parcial preservando o que veio vazio.
 * Devolve a config já mascarada.
 */
export async function saveZapZapConfig(
  workspaceId: string,
  input: ZapZapConfigInput,
): Promise<ZapZapConfigMasked> {
  // Base do merge = linha atual (ou vazia se ainda não existe). Sem try/catch
  // aqui de propósito: salvar sem service role deve FALHAR, não cair em env.
  const current = (await readRow(workspaceId)) ?? EMPTY_ROW;
  const next = normalize(current, input);

  const { error } = await supabaseAdmin
    .from("zapzap_config")
    .upsert({ workspace_id: workspaceId, ...next }, { onConflict: "workspace_id" });
  if (error) throw new Error(error.message);

  return toMasked(rowToConfig(next));
}
