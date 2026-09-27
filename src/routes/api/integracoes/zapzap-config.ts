import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { saveZapZapConfig, getZapZapConfigMasked } from "@/modules/integrations/zapzap-config.server";

/**
 * Config da integração ZapZap por workspace.
 *   GET  ?workspace_id=...  → status mascarado (nunca devolve o secret cru)
 *   POST { workspace_id, api_key, api_secret, instance_id, base_url? } → salva
 * Autenticado por Bearer (sessão Supabase). Escrita exige ser membro do workspace.
 */

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function authAndWorkspace(request: Request, workspaceId: string | null) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return { error: json({ error: "Não autenticado." }, 401) };

  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { error: json({ error: "Configuração do servidor indisponível." }, 500) };

  const authClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData.user) return { error: json({ error: "Sessão inválida ou expirada." }, 401) };
  if (!workspaceId) return { error: json({ error: "workspace_id é obrigatório." }, 400) };

  // Membro? filtra por workspace_id + user_id (unique) → 0 ou 1 linha.
  const { data: member } = await authClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!member) return { error: json({ error: "Sem acesso a este workspace." }, 403) };

  return { userId: userData.user.id };
}

export const Route = createFileRoute("/api/integracoes/zapzap-config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const workspaceId = new URL(request.url).searchParams.get("workspace_id");
        const ctx = await authAndWorkspace(request, workspaceId);
        if (ctx.error) return ctx.error;
        try {
          const masked = await getZapZapConfigMasked(workspaceId!);
          return json(masked);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Erro ao ler config." }, 500);
        }
      },
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") return json({ error: "Payload inválido." }, 400);
        const b = body as Record<string, unknown>;
        const workspaceId = typeof b.workspace_id === "string" ? b.workspace_id : null;
        const ctx = await authAndWorkspace(request, workspaceId);
        if (ctx.error) return ctx.error;
        try {
          await saveZapZapConfig(workspaceId!, {
            api_key: String(b.api_key ?? ""),
            api_secret: String(b.api_secret ?? ""),
            instance_id: String(b.instance_id ?? ""),
            base_url: typeof b.base_url === "string" ? b.base_url : undefined,
          });
          return json({ status: "ok", ...(await getZapZapConfigMasked(workspaceId!)) });
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Erro ao salvar config." }, 400);
        }
      },
    },
  },
});
