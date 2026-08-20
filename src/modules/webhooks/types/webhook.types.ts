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
  }).passthrough().optional(),
}).passthrough();

export type ZapZapPayload = z.infer<typeof ZapZapPayloadSchema>;

export interface WebhookLog {
  id: string;
  workspace_id: string;
  external_id?: string;
  provider: string;
  instance_id?: string;
  event_type: string;
  contact_phone?: string;
  contact_name?: string;
  message_text?: string;
  payload: any;
  status: 'pending' | 'processed' | 'error';
  error_message?: string;
  processed_at?: string;
  created_at: string;
}
