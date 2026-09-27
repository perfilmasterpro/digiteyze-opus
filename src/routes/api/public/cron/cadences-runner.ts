import { createFileRoute } from '@tanstack/react-router';

/**
 * Executor agendado das etapas vencidas das cadências comerciais.
 *
 * Dois gatilhos suportados:
 *  - GET  → Vercel Cron (definido em vercel.json). O Vercel injeta
 *           `Authorization: Bearer <CRON_SECRET>` quando a env CRON_SECRET existe.
 *  - POST → agendador externo / pg_cron, com `Authorization: Bearer <segredo>`.
 *
 * Aceita `CRON_SECRET` (convenção do Vercel Cron) OU `CADENCE_CRON_SECRET`
 * (nome legado). Basta setar UM dos dois no ambiente.
 */
function getSecret(): string | undefined {
  return (
    process.env['CRON_SECRET']?.trim() ||
    process.env['CADENCE_CRON_SECRET']?.trim() ||
    undefined
  );
}

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length === eb.length ? 0 : 1;
  const len = Math.max(ea.length, eb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

async function handle(request: Request): Promise<Response> {
  const secret = getSecret();
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

  if (!timingSafeEqual(token, secret)) {
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
}

export const Route = createFileRoute('/api/public/cron/cadences-runner')({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
