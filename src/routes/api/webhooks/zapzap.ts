import { createFileRoute } from '@tanstack/react-router';
import { ZapZapPayloadSchema } from '@/modules/webhooks/types/webhook.types';
import { WebhookService } from '@/modules/webhooks/services/webhook.service';

/**
 * Endpoint de Webhook para ZapZap API.
 * Recebe eventos de mensagens, status, contatos, etc.
 * 
 * URL: /api/webhooks/zapzap
 * Parâmetro opcional: ?workspace_id=...
 */
export const Route = createFileRoute('/api/webhooks/zapzap')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Validar Workspace ID
          const url = new URL(request.url);
          const workspaceId = url.searchParams.get('workspace_id');

          if (!workspaceId) {
            console.error('[Webhook] Missing workspace_id');
            return new Response(JSON.stringify({ error: 'Missing workspace_id parameter' }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 2. Parse e Validação do JSON
          const body = await request.json();
          const validation = ZapZapPayloadSchema.safeParse(body);

          if (!validation.success) {
            console.error('[Webhook] Validation failed:', validation.error);
            return new Response(JSON.stringify({ error: 'Invalid payload format' }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const payload = validation.data;

          // 3. Registrar o evento de forma assíncrona (não bloqueia a resposta 200)
          // Na prática, aguardamos o insert para garantir o registro, mas respondemos rápido.
          const { error } = await WebhookService.logWebhook(workspaceId, 'zapzap', payload);

          if (error) {
            console.error('[Webhook] Database error:', error);
            // Mesmo com erro de banco, costuma-se responder 200 se a entrega foi aceita
            // para evitar retentativas infinitas do provider caso o erro seja do nosso lado.
            // Mas para auditoria interna, podemos logar o erro.
          }

          // 4. Resposta 200 OK
          return new Response(JSON.stringify({ status: 'ok', message: 'Webhook received' }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('[Webhook] Critical error:', error);
          return new Response(JSON.stringify({ error: 'Internal server error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
