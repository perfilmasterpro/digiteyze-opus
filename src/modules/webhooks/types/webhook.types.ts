import { z } from "zod";

/**
 * Estrutura real do evento `messages` do ZapZap:
 * data.message (conteúdo/IDs/direção) e data.chat (contato).
 * Mantemos compatibilidade com o formato antigo (campos direto em `data`).
 */
export const ZapZapMessageSchema = z.object({
  id: z.string().optional(),
  messageid: z.string().optional(),
  chatid: z.string().optional(),
  chatlid: z.string().optional(),
  content: z.string().optional(),
  text: z.string().optional(),
  fromMe: z.boolean().optional(),
  owner: z.string().optional(),
  sender: z.string().optional(),
  sender_pn: z.string().optional(),
  sender_lid: z.string().optional(),
  senderName: z.string().optional(),
  messageType: z.string().optional(),
  messageTimestamp: z.union([z.number(), z.string()]).optional(),
  type: z.string().optional(),
  isGroup: z.boolean().optional(),
}).passthrough();

export const ZapZapChatSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  owner: z.string().optional(),
  wa_chatid: z.string().optional(),
  wa_contactName: z.string().optional(),
  wa_isGroup: z.boolean().optional(),
}).passthrough();

export const ZapZapPayloadSchema = z.object({
  instance_id: z.string().optional(),
  instance_name: z.string().optional(),
  event: z.string(),
  event_id: z.string().nullable().optional(),
  delivery_id: z.string().nullable().optional(),
  data: z.object({
    // Formato real (evento `messages`)
    message: ZapZapMessageSchema.optional(),
    chat: ZapZapChatSchema.optional(),
    // Formato legado
    id: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    pushName: z.string().optional(),
    body: z.string().optional(),
    type: z.string().optional(),
    timestamp: z.union([z.number(), z.string()]).optional(),
    chatId: z.string().optional(),
    messageId: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export type ZapZapPayload = z.infer<typeof ZapZapPayloadSchema>;
export type ZapZapMessage = z.infer<typeof ZapZapMessageSchema>;
export type ZapZapChat = z.infer<typeof ZapZapChatSchema>;

/** Resultado normalizado da extração do payload (formato novo ou legado). */
export interface ZapZapExtracted {
  event: string;
  instanceId?: string | null;
  externalId?: string | null;
  messageId?: string | null;
  chatId?: string | null;
  senderPhone?: string | null;
  receiverPhone?: string | null;
  /** Telefone do interlocutor (contato), independente da direção. */
  contactPhone?: string | null;
  contactName?: string | null;
  content?: string | null;
  isInbound: boolean;
  messageType?: string | null;
  timestamp?: string | null;
}

export interface WebhookLog {
  id: string;
  workspace_id: string;
  external_id?: string | null;
  provider: string;
  instance_id?: string | null;
  event: string;
  sender_phone?: string | null;
  receiver_phone?: string | null;
  chat_id?: string | null;
  message_id?: string | null;
  payload: any;
  status: 'pending' | 'processed' | 'error' | 'duplicate';
  lead_id?: string | null;
  lead_match_status?: 'matched' | 'unmatched' | 'ambiguous' | null;
  error_message?: string | null;
  processed_at?: string | null;

  created_at: string;
}
