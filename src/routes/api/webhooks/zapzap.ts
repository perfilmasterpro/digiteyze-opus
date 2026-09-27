import { createFileRoute } from '@tanstack/react-router';
import { ZapZapPayloadSchema } from '@/modules/webhooks/types/webhook.types';
import { WebhookService } from '@/modules/webhooks/services/webhook.service';

/**
 * Comparação de tempo constante entre duas strings, para não vazar o segredo
 * via timing de comparação. Independe do comprimento por usar OR acumulado.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

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

          // 1b. Autenticidade: se ZAPZAP_WEBHOOK_SECRET estiver setado, exigir o
          // token (query ?token= ou header x-webhook-secret / authorization Bearer)
          // com comparação de tempo constante. Sem a env, segue aberto (compat).
          const expectedSecret = process.env.ZAPZAP_WEBHOOK_SECRET?.trim();
          if (expectedSecret) {
            const headerAuth = request.headers.get('authorization') ?? '';
            const bearer = headerAuth.startsWith('Bearer ')
              ? headerAuth.slice('Bearer '.length).trim()
              : '';
            const providedSecret =
              url.searchParams.get('token') ??
              request.headers.get('x-webhook-secret') ??
              bearer ??
              '';

            if (!timingSafeEqualStr(providedSecret, expectedSecret)) {
              console.error('[Webhook] Invalid or missing webhook secret');
              return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              });
            }
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

