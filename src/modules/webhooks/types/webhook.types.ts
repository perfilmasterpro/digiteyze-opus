import { z } from "zod";

export const ZapZapPayloadSchema = z.object({
  instance_id: z.string().optional(),
  event: z.string(),
  data: z.object({
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
