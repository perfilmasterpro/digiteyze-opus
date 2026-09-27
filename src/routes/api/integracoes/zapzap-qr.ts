import { createFileRoute } from "@tanstack/react-router";

/**
 * QR code de conexão da instância ZapZap do workspace.
 *
 * POST { workspace_id } → chama a API de GESTÃO do ZapZap
 *   GET {base}/api/v1/instances/{instanceId}/qrcode
 * com as credenciais do workspace (x-api-key / x-api-secret) e devolve:
 *   - { connected: true } quando a instância já está logada (não há QR a exibir);
 *   - { connected: false, qrcode, status } com o QR (base64/string) para escanear.
 *
 * Auth: Bearer do usuário + membership (mesmo padrão de zapzap-config/zapzap-flow).
 *
 * Obs.: o path é o de GESTÃO (`/api/v1/instances/:id/qrcode`), confirmado no
 * backend real do ZapZap (apiv1.routes.ts) — NÃO é o coringa `/api/v1/:id/*`.
 */
export const Route = createFileRoute("/api/integracoes/zapzap-qr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as Record<
            string,
            unknown
          > | null;
          const workspaceId = body?.workspace_id;

          const { authAndWorkspace } = await import(
            "@/modules/integrations/services/api-auth.server"
          );
          const auth = await authAndWorkspace(request, workspaceId);
          if (!auth.ok) return auth.response;

          const { getZapZapConfig } = await import(
            "@/modules/integrations/services/zapzap-config.server"
          );
          const cfg = await getZapZapConfig(workspaceId as string);

          if (!cfg.apiKey || !cfg.apiSecret || !cfg.instanceId) {
            return new Response(
              JSON.stringify({
                error:
                  "Configure a API Key, o Secret e o Instance ID antes de gerar o QR.",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const qrUrl = `${cfg.baseUrl}/api/v1/instances/${encodeURIComponent(
            cfg.instanceId,
          )}/qrcode`;

          const response = await fetch(qrUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": cfg.apiKey,
              "x-api-secret": cfg.apiSecret,
            },
          });

          const responseText = await response.text();
          let providerBody: unknown = null;
          try {
            providerBody = responseText ? JSON.parse(responseText) : null;
          } catch {
            providerBody = responseText;
          }

          if (!response.ok) {
            const detail =
              typeof providerBody === "string"
                ? providerBody
                : providerBody && typeof providerBody === "object"
                  ? JSON.stringify(providerBody)
                  : "";
            return new Response(
              JSON.stringify({
                error: `Não foi possível obter o QR (HTTP ${response.status})${
                  detail ? `: ${detail.slice(0, 300)}` : "."
                }`,
              }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          const provider = (providerBody ?? {}) as Record<string, unknown>;
          const instance = (provider.instance ?? {}) as Record<string, unknown>;
          const statusStr =
            typeof instance.status === "string" ? instance.status : undefined;

          // Já conectado: o ZapZap devolve { connected:true, loggedIn:true, ... }
          // (ou a instância com status 'connected'). Nesse caso não há QR.
          const alreadyConnected =
            provider.connected === true ||
            provider.loggedIn === true ||
            statusStr === "connected";

          if (alreadyConnected) {
            return new Response(
              JSON.stringify({ connected: true, status: statusStr ?? "connected" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }

          const qrcode =
            (typeof instance.qrcode === "string" && instance.qrcode) ||
            (typeof provider.qrcode === "string" && provider.qrcode) ||
            null;

          if (!qrcode) {
            return new Response(
              JSON.stringify({
                error:
                  "O ZapZap não retornou o QR. Tente novamente em alguns segundos.",
              }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(
            JSON.stringify({ connected: false, qrcode, status: statusStr ?? null }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          console.error("[ZapZap QR] error:", error);
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Erro ao gerar o QR do ZapZap.",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
