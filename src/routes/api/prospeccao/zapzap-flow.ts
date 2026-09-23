import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

import { sendZapZapText } from '@/modules/cadences/services/zapzap-api.server';

/**
 * Endpoint autenticado usado pelo Growth para disparos de saída.
 *
 * O envio agora é feito diretamente pela API REST do ZapZap.
 * Webhook não é usado para disparar mensagens.
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
            return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const supabaseUrl =
            process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey =
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

          if (!supabaseUrl || !supabaseKey) {
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
            return new Response(JSON.stringify({ error: 'Payload inválido.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
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
            etapa_nome,
            mensagem,
          } = body as Record<string, unknown>;

          if (typeof workspace_id !== 'string' || typeof lead_id !== 'string') {
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

          const messageText =
            typeof mensagem === 'string' ? mensagem.trim() : '';

          if (!messageText) {
            return new Response(
              JSON.stringify({
                error: 'Etapa sem mensagem configurada. Nada foi enviado.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const result = await sendZapZapText({
            phone: rawPhone,
            text: messageText,
          });

          console.info('[ZapZap API] Disparo enviado', {
            workspace_id,
            lead_id,
            cadence_id,
            lead_cadence_id,
            etapa,
            etapa_nome,
            user_id: userData.user.id,
            provider_status: result.status,
            nome,
            empresa,
          });

          return new Response(
            JSON.stringify({
              status: 'ok',
              provider_status: result.status,
              provider_response: result.body,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } catch (error) {
          console.error('[ZapZap API] Erro ao disparar:', error);
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : 'Erro interno ao disparar o ZapZap.',
            }),
            { status: 502, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
