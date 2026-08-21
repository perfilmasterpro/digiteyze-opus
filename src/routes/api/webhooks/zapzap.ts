import { createFileRoute } from '@tanstack/react-router';
import { ZapZapPayloadSchema } from '@/modules/webhooks/types/webhook.types';
import { WebhookService } from '@/modules/webhooks/services/webhook.service';

/**
 * Endpoint de Webhook para ZapZap API.
 * EXCLUSIVAMENTE para a Fase 3: Recebimento e Persistência Segura.
 * 
 * URL: /api/webhooks/zapzap
 * Parâmetro OBRIGATÓRIO: ?workspace_id=...
 */
export const Route = createFileRoute('/api/webhooks/zapzap')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Extrair e Validar Workspace ID da URL
          const url = new URL(request.url);
          const workspaceId = url.searchParams.get('workspace_id');

          if (!workspaceId) {
            console.error('[Webhook] Missing workspace_id');
            return new Response(JSON.stringify({ 
              error: 'O parâmetro workspace_id é obrigatório.' 
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 2. Parse e Validação do JSON via Zod
          const body = await request.json();
          const validation = ZapZapPayloadSchema.safeParse(body);

          if (!validation.success) {
            console.error('[Webhook] Validation failed:', validation.error);
            return new Response(JSON.stringify({ 
              error: 'Formato de payload inválido.',
              details: validation.error.format()
            }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const payload = validation.data;

          // 3. Persistência Segura via Service (usa supabaseAdmin internamente)
          const { data, error } = await WebhookService.logWebhook(workspaceId, 'zapzap', payload);

          if (error) {
            console.error('[Webhook] Persistence error:', error);
            
            // Se o erro for de workspace inválido (definido no service)
            if (error.message.includes('Workspace inválido')) {
              return new Response(JSON.stringify({ error: error.message }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              });
            }

            return new Response(JSON.stringify({ 
              error: 'Falha ao persistir o evento no banco de dados.' 
            }), { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // 4. Resposta Adequada
          const isDuplicate = data?.status === 'duplicate';
          return new Response(JSON.stringify({ 
            status: 'ok', 
            message: isDuplicate ? 'Evento duplicado (já processado).' : 'Evento recebido e persistido.',
            id: data?.id
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('[Webhook] Critical server error:', error);
          return new Response(JSON.stringify({ error: 'Erro interno no servidor.' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});

