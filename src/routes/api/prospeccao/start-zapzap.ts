import { createFileRoute } from '@tanstack/react-router';
import { getLead } from '@/modules/prospeccao/services/leads.service';
import { startCadenceForLead } from '@/modules/cadences/services/lead-cadences.service';

/**
 * Inicia a cadência comercial e dispara o Flow do ZapZap.
 *
 * A chamada ao ZapZap é feita somente no servidor.
 * O endpoint do Flow é mantido em variável de ambiente.
 */
export const Route = createFileRoute('/api/prospeccao/start-zapzap')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);

          const workspaceId =
            body && typeof body.workspace_id === 'string'
              ? body.workspace_id
              : null;
          const leadId =
            body && typeof body.lead_id === 'string' ? body.lead_id : null;
          const cadenceId =
            body && typeof body.cadence_id === 'string' ? body.cadence_id : null;

          if (!workspaceId || !leadId || !cadenceId) {
            return new Response(
              JSON.stringify({
                error: 'workspace_id, lead_id e cadence_id são obrigatórios.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const lead = await getLead(workspaceId, leadId);

          if (!lead) {
            return new Response(
              JSON.stringify({ error: 'Lead não encontrado.' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            );
          }

          const cadence = await startCadenceForLead(
            workspaceId,
            leadId,
            cadenceId,
          );

          const origin = new URL(request.url).origin;
          const triggerResponse = await fetch(
            `${origin}/api/prospeccao/zapzap-flow`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workspace_id: workspaceId,
                lead_id: leadId,
                empresa: (lead as any).empresa ?? (lead as any).nome_empresa,
                nome: (lead as any).nome,
                telefone: (lead as any).telefone,
                whatsapp: (lead as any).whatsapp,
                cadence_id: cadence.cadence_id,
                lead_cadence_id: cadence.id,
                etapa: cadence.etapa_atual,
              }),
            },
          );

          if (!triggerResponse.ok) {
            console.error(
              '[Prospecção] Cadência criada, mas Flow não foi disparado.',
              await triggerResponse.text(),
            );

            return new Response(
              JSON.stringify({
                status: 'cadence_started_flow_failed',
                cadence_id: cadence.id,
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
              cadence_id: cadence.id,
              etapa: cadence.etapa_atual,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } catch (error) {
          console.error('[Prospecção] Erro ao iniciar fluxo:', error);
          return new Response(
            JSON.stringify({ error: 'Não foi possível iniciar a prospecção.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  },
});
