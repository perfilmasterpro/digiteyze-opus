import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { getZapZapConfig } from "@/modules/integrations/zapzap-config.server";

/**
 * QR / status de conexão da instância ZapZap do workspace.
 *   GET ?workspace_id=... → { connected, status, qrcode? }
 * Se desconectada, retorna o QR (base64) pra escanear no WhatsApp.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const Route = createFileRoute("/api/integracoes/zapzap-qr")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const workspaceId = url.searchParams.get("workspace_id");
        const authorization = request.headers.get("authorization");
        const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
        if (!token) return json({ error: "Não autenticado." }, 401);
        if (!workspaceId) return json({ error: "workspace_id é obrigatório." }, 400);

        const sbUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
        const sbKey = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!sbUrl || !sbKey) return json({ error: "Config do servidor indisponível." }, 500);

        const authClient = createClient(sbUrl, sbKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: userErr } = await authClient.auth.getUser(token);
        if (userErr || !userData.user) return json({ error: "Sessão inválida." }, 401);
        const { data: member } = await authClient
          .from("workspace_members").select("workspace_id")
          .eq("workspace_id", workspaceId).eq("user_id", userData.user.id).maybeSingle();
        if (!member) return json({ error: "Sem acesso a este workspace." }, 403);

        const cfg = await getZapZapConfig(workspaceId);
        if (!cfg) return json({ error: "ZapZap não configurado. Salve as credenciais primeiro." }, 400);

        try {
          const resp = await fetch(
            `${cfg.base_url.replace(/\/$/, "")}/api/v1/instances/${encodeURIComponent(cfg.instance_id)}/qrcode`,
            { headers: { "x-api-key": cfg.api_key, "x-api-secret": cfg.api_secret } },
          );
          const text = await resp.text();
          let body: unknown = null;
          try { body = text ? JSON.parse(text) : null; } catch { body = text; }
          if (!resp.ok) {
            const detail = typeof body === "string" ? body : JSON.stringify(body);
            return json({ error: `ZapZap recusou (HTTP ${resp.status}): ${String(detail).slice(0, 300)}` }, 502);
          }
          return json(body);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Falha ao consultar o ZapZap." }, 502);
        }
      },
    },
  },
});
