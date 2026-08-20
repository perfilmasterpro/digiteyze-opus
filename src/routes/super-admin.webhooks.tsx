import { createFileRoute } from "@tanstack/react-router";
import { WebhookLogsList } from "@/modules/webhooks/components/webhook-logs-list";

export const Route = createFileRoute("/super-admin/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks (ZapZap) — Growth OS" },
      { name: "description", content: "Visualização de webhooks recebidos do ZapZap API." },
    ],
  }),
  component: WebhooksAdminPage,
});

function WebhooksAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Logs de Webhooks</h2>
        <p className="text-sm text-muted-foreground">
          Histórico de eventos recebidos do ZapZap API.
        </p>
      </div>

      <WebhookLogsList />
    </div>
  );
}
