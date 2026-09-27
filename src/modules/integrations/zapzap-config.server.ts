/**
 * Config da integração ZapZap por workspace (self-service).
 *
 * Guardada em `workspace_settings.features.zapzap` (JSONB) — sem tabela nova.
 * Escrita/leitura via service role (supabaseAdmin). O envio de saída e o cron
 * leem daqui; se não houver config no workspace, cai no fallback por env
 * (ZAPZAP_API_KEY/ZAPZAP_API_SECRET/ZAPZAP_INSTANCE_ID/ZAPZAP_API_BASE_URL).
 */

import type { Json } from "@/integrations/supabase/types";

export interface ZapZapConfig {
  api_key: string;
  api_secret: string;
  instance_id: string;
  base_url: string;
}

const DEFAULT_BASE = "https://api.zapzapapi.com";

function fromEnv(): ZapZapConfig | null {
  const api_key = process.env.ZAPZAP_API_KEY?.trim();
  const api_secret = process.env.ZAPZAP_API_SECRET?.trim();
  const instance_id = process.env.ZAPZAP_INSTANCE_ID?.trim();
  if (!api_key || !api_secret || !instance_id) return null;
  return {
    api_key,
    api_secret,
    instance_id,
    base_url: (process.env.ZAPZAP_API_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, ""),
  };
}

function normalize(raw: unknown): ZapZapConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const api_key = typeof r.api_key === "string" ? r.api_key.trim() : "";
  const api_secret = typeof r.api_secret === "string" ? r.api_secret.trim() : "";
  const instance_id = typeof r.instance_id === "string" ? r.instance_id.trim() : "";
  if (!api_key || !api_secret || !instance_id) return null;
  const base_url = (typeof r.base_url === "string" && r.base_url.trim() ? r.base_url.trim() : DEFAULT_BASE).replace(/\/$/, "");
  return { api_key, api_secret, instance_id, base_url };
}

/** Config efetiva do workspace: banco primeiro, env como fallback. */
export async function getZapZapConfig(workspaceId: string): Promise<ZapZapConfig | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("workspace_settings")
      .select("features")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!error && data?.features) {
      const zap = (data.features as Record<string, unknown>).zapzap;
      const cfg = normalize(zap);
      if (cfg) return cfg;
    }
  } catch {
    // cai no fallback por env
  }
  return fromEnv();
}

/** Grava a config no workspace_settings.features.zapzap (merge, não apaga outras features). */
export async function saveZapZapConfig(workspaceId: string, input: {
  api_key: string; api_secret: string; instance_id: string; base_url?: string;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: current } = await supabaseAdmin
    .from("workspace_settings")
    .select("features")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // M3: campo em branco MANTÉM o valor atual (editar sem redigitar key/secret).
  const existing = normalize((current?.features as Record<string, unknown>)?.zapzap);
  const merged = {
    api_key: input.api_key?.trim() || existing?.api_key || "",
    api_secret: input.api_secret?.trim() || existing?.api_secret || "",
    instance_id: input.instance_id?.trim() || existing?.instance_id || "",
    base_url: input.base_url?.trim() || existing?.base_url || DEFAULT_BASE,
  };
  const cfg = normalize(merged);
  if (!cfg) throw new Error("Preencha key, secret e instance (na primeira vez).");

  const features = { ...((current?.features as Record<string, unknown>) ?? {}), zapzap: cfg };

  // upsert por workspace_id (a migration semeia 1 linha por workspace; upsert cobre o resto).
  // `features` é jsonb no schema; cast p/ Json (mesmo padrão de leads.service.ts).
  const { error } = await supabaseAdmin
    .from("workspace_settings")
    .upsert(
      { workspace_id: workspaceId, features: features as unknown as Json },
      { onConflict: "workspace_id" },
    );
  if (error) throw new Error(error.message);
}

/** Status mascarado pra UI (nunca devolve o secret cru ao cliente). */
export async function getZapZapConfigMasked(workspaceId: string): Promise<{
  configured: boolean; source: "workspace" | "env" | null;
  instance_id: string | null; base_url: string | null;
  api_key_masked: string | null; api_secret_masked: string | null;
}> {
  let source: "workspace" | "env" | null = null;
  let cfg: ZapZapConfig | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("workspace_settings").select("features").eq("workspace_id", workspaceId).maybeSingle();
    const zap = normalize((data?.features as Record<string, unknown>)?.zapzap);
    if (zap) { cfg = zap; source = "workspace"; }
  } catch { /* ignore */ }
  if (!cfg) { const e = fromEnv(); if (e) { cfg = e; source = "env"; } }

  const mask = (v: string) => (v.length <= 8 ? "••••" : `${v.slice(0, 4)}••••${v.slice(-4)}`);
  return {
    configured: Boolean(cfg),
    source,
    instance_id: cfg?.instance_id ?? null,
    base_url: cfg?.base_url ?? null,
    api_key_masked: cfg ? mask(cfg.api_key) : null,
    api_secret_masked: cfg ? mask(cfg.api_secret) : null,
  };
}
