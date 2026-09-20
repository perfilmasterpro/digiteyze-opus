import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

/**
 * Dispara o Flow de prospecção do ZapZap para um lead.
 *
 * Growth continua responsável pela cadência/estado comercial.
 * O ZapZap Flow fica responsável pela conversa e pelas respostas.
 *
 * A URL do Flow permanece exclusivamente no servidor.
 */
export const Route = createFileRoute('/api/prospeccao/zapzap-flow')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authorization = request.headers.get('authorization');
          const token = authorization?.startsWith('Bearer ')
            ? authorization.slice('Bearer '.length).trim()
            : '';

          if (!token) {
            return new Response(
              JSON.stringify({ error: 'Não autenticado.' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const supabaseUrl =
            process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey =
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          if (!supabaseUrl || !supabaseKey) {
            console.error('[ZapZap Flow] Supabase server config ausente.');
            return new Response(
              JSON.stringify({ error: 'Configuração do servidor indisponível.' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const authClient = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          });

          const { data: userData, error: userError } =
            await authClient.auth.getUser(token);

          if (userError || !userData.user) {
            return new Response(
              JSON.stringify({ error: 'Sessão inválida ou expirada.' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } },
            );
          }

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

          const rawPhone =
            typeof whatsapp === 'string' && whatsapp.trim()
              ? whatsapp
              : typeof telefone === 'string'
                ? telefone
                : '';

          const digits = rawPhone.replace(/\D/g, '');
          const phone = digits
            ? digits.startsWith('55')
              ? digits
              : `55${digits}`
            : '';

          if (!phone || phone.length < 12) {
            return new Response(
              JSON.stringify({ error: 'Lead sem telefone/WhatsApp válido.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const webhookUrl =
            process.env.ZAPZAP_GROWTH_FLOW_WEBHOOK_URL?.trim();

          if (!webhookUrl) {
            console.error(
              '[ZapZap Flow] ZAPZAP_GROWTH_FLOW_WEBHOOK_URL não configurada.',
            );
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
            user_id: userData.user.id,
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
