import { createFileRoute } from '@tanstack/react-router';

/**
 * Executor agendado das etapas vencidas das cadências comerciais.
 *
 * Chamado periodicamente pelo agendador (pg_cron) com o header
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export const Route = createFileRoute('/api/public/cron/cadences-runner')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['CADENCE_CRON_SECRET']?.trim();

        if (!secret) {
          return new Response(
            JSON.stringify({ error: 'Agendador não configurado.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          );
        }

        const authorization = request.headers.get('authorization') ?? '';
        const token = authorization.startsWith('Bearer ')
          ? authorization.slice('Bearer '.length).trim()
          : '';

        // Comparação de tempo constante
        const a = new TextEncoder().encode(token);
        const b = new TextEncoder().encode(secret);
        let diff = a.length === b.length ? 0 : 1;
        const len = Math.max(a.length, b.length);
        for (let i = 0; i < len; i++) {
          diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
        }

        if (diff !== 0) {
          return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          const { runDueCadenceSteps } = await import(
            '@/modules/cadences/services/cadence-runner.server'
          );
          const result = await runDueCadenceSteps();

          return new Response(JSON.stringify({ status: 'ok', ...result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('[Cadence Runner] Erro interno:', error);
          return new Response(
            JSON.stringify({ error: 'Falha ao processar etapas vencidas.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
