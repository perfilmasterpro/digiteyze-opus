import { createFileRoute } from '@tanstack/react-router';
import { normalizePhone } from '@/lib/utils';

/**
 * Dispara o Flow de prospecção do ZapZap para um lead.
 *
 * Growth continua responsável pela cadência/estado comercial.
 * O ZapZap Flow fica responsável pela conversa e pelas respostas.
 *
 * Variável server-side obrigatória:
 * ZAPZAP_GROWTH_FLOW_WEBHOOK_URL
 */
export const Route = createFileRoute('/api/prospeccao/zapzap-flow')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);

          if (!body || typeof body !== 'object') {
            return new Response(
              JSON.stringify({ error: 'Payload inválido.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const {
            workspace_id,
            lead_id,
            empresa,
            nome,
            telefone,
            whatsapp,
            cadence_id,
            lead_cadence_id,
            etapa,
          } = body as Record<string, unknown>;

          if (
            typeof workspace_id !== 'string' ||
            typeof lead_id !== 'string'
          ) {
            return new Response(
              JSON.stringify({ error: 'workspace_id e lead_id são obrigatórios.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const phone = normalizePhone(
            String(
              typeof whatsapp === 'string' && whatsapp.trim()
                ? whatsapp
                : typeof telefone === 'string'
                  ? telefone
                  : '',
            ),
          );

          if (!phone) {
            return new Response(
              JSON.stringify({ error: 'Lead sem telefone/WhatsApp válido.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const webhookUrl = process.env.ZAPZAP_GROWTH_FLOW_WEBHOOK_URL?.trim();

          if (!webhookUrl) {
            console.error('[ZapZap Flow] ZAPZAP_GROWTH_FLOW_WEBHOOK_URL não configurada.');
            return new Response(
              JSON.stringify({ error: 'Webhook do ZapZap Flow não configurado.' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const payload = {
            source: 'growth_os',
            event: 'prospecting.cadence.started',
            workspace_id,
            lead_id,
            cadence_id: typeof cadence_id === 'string' ? cadence_id : null,
            lead_cadence_id:
              typeof lead_cadence_id === 'string' ? lead_cadence_id : null,
            etapa: typeof etapa === 'number' ? etapa : 1,
            data: {
              customer: {
                phone,
                name: typeof nome === 'string' ? nome : null,
                company: typeof empresa === 'string' ? empresa : null,
              },
            },
          };

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();

          if (!response.ok) {
            console.error(
              '[ZapZap Flow] Falha no webhook:',
              response.status,
              responseText.slice(0, 500),
            );
            return new Response(
              JSON.stringify({
                error: 'ZapZap Flow recusou o disparo.',
                status: response.status,
              }),
              {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }

          return new Response(
            JSON.stringify({
              status: 'ok',
              provider_status: response.status,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } catch (error) {
          console.error('[ZapZap Flow] Erro interno:', error);
          return new Response(
            JSON.stringify({ error: 'Erro interno ao disparar o ZapZap Flow.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
