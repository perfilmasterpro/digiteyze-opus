import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { sendZapZapText } from '@/lib/zapzap.server';
import { createLeadInteraction } from '@/modules/prospeccao/services/lead-interactions.service';

const SendTextSchema = z.object({
  workspace_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  number: z.string().min(10).max(20),
  text: z.string().trim().min(1).max(10000),
  delay: z.number().int().min(0).max(30000).optional(),
  replyid: z.string().trim().max(200).optional(),
  digitando: z.boolean().optional(),
});

/**
 * Server endpoint used by the Growth UI to send a WhatsApp message through ZapZap.
 * ZapZap credentials never reach the browser.
 */
export const Route = createFileRoute('/api/whatsapp/send-text')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = SendTextSchema.safeParse(body);

          if (!parsed.success) {
            return Response.json(
              { error: 'Dados inválidos.', details: parsed.error.flatten() },
              { status: 400 },
            );
          }

          const input = parsed.data;
          const result = await sendZapZapText({
            number: input.number,
            text: input.text,
            delay: input.delay,
            replyid: input.replyid,
            digitando: input.digitando,
          });

          const interaction = await createLeadInteraction(
            input.workspace_id,
            input.lead_id,
            {
              tipo: 'whatsapp',
              descricao: input.text,
              payload: {
                direcao: 'outgoing',
                message_id: result.messageId,
                external_id: result.messageId,
                receiver_phone: input.number.replace(/\D/g, ''),
                instance_id: process.env.ZAPZAP_INSTANCE_ID,
                provider: 'zapzap',
                metadata: { status: result.status },
              },
            },
            true,
          );

          return Response.json({
            ok: true,
            messageId: result.messageId,
            status: result.status,
            interactionId: interaction.id,
          });
        } catch (error) {
          console.error('[WhatsApp] Send text failed:', error);
          return Response.json(
            { error: error instanceof Error ? error.message : 'Falha ao enviar WhatsApp.' },
            { status: 502 },
          );
        }
      },
    },
  },
});
