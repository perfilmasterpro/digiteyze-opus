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
