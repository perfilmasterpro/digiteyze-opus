import type { LeadInteraction } from '../types/entities.types';

export type SendWhatsAppInput = {
  workspaceId: string;
  leadId: string;
  number: string;
  text: string;
  delay?: number;
  replyId?: string;
  digitando?: boolean;
};

export type SendWhatsAppResult = {
  messageId: string;
  status: string;
  interactionId: string;
};

/**
 * Browser-side wrapper. The ZapZap credentials remain server-side.
 */
export async function sendWhatsAppText(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const response = await fetch('/api/whatsapp/send-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_id: input.workspaceId,
      lead_id: input.leadId,
      number: input.number,
      text: input.text,
      delay: input.delay,
      replyid: input.replyId,
      digitando: input.digitando,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível enviar a mensagem pelo WhatsApp.');
  }

  return data as SendWhatsAppResult;
}
