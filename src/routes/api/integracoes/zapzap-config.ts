import { createFileRoute } from "@tanstack/react-router";

/**
 * Config da integração ZapZap por workspace.
 *
 * GET  ?workspace_id=UUID  → config MASCARADA (nunca devolve segredo em claro).
 * POST { workspace_id, api_key?, api_secret?, instance_id?, base_url?, webhook_secret? }
 *      → salva (merge parcial: campo vazio preserva o atual) e devolve a config mascarada.
 *
 * Auth: Bearer do usuário + membership em workspace_members (mesmo padrão do
 * zapzap-flow / zapzap-qr). 401 sem token, 403 sem membership.
 *
 * Server-only (config + service role) é carregado por import dinâmico dentro
 * dos handlers para não vazar para o bundle do cliente.
 */
export const Route = createFileRoute("/api/integracoes/zapzap-config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const workspaceId = url.searchParams.get("workspace_id");

          const { authAndWorkspace } = await import(
            "@/modules/integrations/services/api-auth.server"
          );
          const auth = await authAndWorkspace(request, workspaceId);
          if (!auth.ok) return auth.response;

          const { getZapZapConfigMasked } = await import(
            "@/modules/integrations/services/zapzap-config.server"
          );
          const config = await getZapZapConfigMasked(workspaceId as string);

          return new Response(JSON.stringify({ config }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[ZapZap config] GET error:", error);
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Erro ao carregar a configuração do ZapZap.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as Record<
            string,
            unknown
          > | null;
          if (!body || typeof body !== "object") {
            return new Response(JSON.stringify({ error: "Payload inválido." }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const workspaceId = body.workspace_id;

          const { authAndWorkspace } = await import(
            "@/modules/integrations/services/api-auth.server"
          );
          const auth = await authAndWorkspace(request, workspaceId);
          if (!auth.ok) return auth.response;

          const str = (v: unknown): string | undefined =>
            typeof v === "string" ? v : undefined;

          const { saveZapZapConfig } = await import(
            "@/modules/integrations/services/zapzap-config.server"
          );
          const config = await saveZapZapConfig(workspaceId as string, {
            apiKey: str(body.api_key),
            apiSecret: str(body.api_secret),
            instanceId: str(body.instance_id),
            baseUrl: str(body.base_url),
            webhookSecret: str(body.webhook_secret),
          });

          return new Response(JSON.stringify({ status: "ok", config }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[ZapZap config] POST error:", error);
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Erro ao salvar a configuração do ZapZap.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
