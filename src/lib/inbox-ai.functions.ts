/**
 * Server functions da Inbox IA — transcrição de voz e classificação
 * do Rascunho Inteligente. Arquivo fino: helpers ficam em inbox-ai.server.ts.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const transcribeSchema = z.object({
  workspaceId: z.string().uuid(),
  audioBase64: z.string().min(100),
  duracaoSeg: z.number().optional(),
  inboxId: z.string().uuid().optional(),
});

const classifySchema = z.object({
  workspaceId: z.string().uuid(),
  texto: z.string().min(1),
  inboxId: z.string().uuid().optional(),
});

export const transcribeCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => transcribeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const {
      assertDailyQuota,
      assertMembership,
      logProcessing,
      transcribeWav,
      STT_MODEL,
    } = await import("./inbox-ai.server");

    const supabase = context.supabase;
    await assertMembership(supabase, data.workspaceId);
    await assertDailyQuota(supabase, data.workspaceId, context.userId);

    const started = Date.now();
    try {
      const texto = await transcribeWav(data.audioBase64);
      await logProcessing(supabase, {
        workspace_id: data.workspaceId,
        user_id: context.userId,
        inbox_id: data.inboxId ?? null,
        etapa: "transcricao",
        modelo: STT_MODEL,
        audio_seg: data.duracaoSeg ?? null,
        latencia_ms: Date.now() - started,
        status: "ok",
      });
      return { texto };
    } catch (error) {
      await logProcessing(supabase, {
        workspace_id: data.workspaceId,
        user_id: context.userId,
        inbox_id: data.inboxId ?? null,
        etapa: "transcricao",
        modelo: STT_MODEL,
        latencia_ms: Date.now() - started,
        status: "erro",
        erro: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

export const classifyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => classifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const {
      assertDailyQuota,
      assertMembership,
      buildWorkspaceContext,
      classifyCapture,
      logProcessing,
      CHAT_MODEL,
    } = await import("./inbox-ai.server");

    const supabase = context.supabase;
    await assertMembership(supabase, data.workspaceId);
    await assertDailyQuota(supabase, data.workspaceId, context.userId);

    const started = Date.now();
    try {
      const ctx = await buildWorkspaceContext(supabase, data.workspaceId);
      const { suggestion, usage } = await classifyCapture(data.texto, ctx);
      await logProcessing(supabase, {
        workspace_id: data.workspaceId,
        user_id: context.userId,
        inbox_id: data.inboxId ?? null,
        etapa: "classificacao",
        modelo: CHAT_MODEL,
        tokens_input: usage.input ?? null,
        tokens_output: usage.output ?? null,
        latencia_ms: Date.now() - started,
        status: "ok",
      });
      return suggestion;
    } catch (error) {
      await logProcessing(supabase, {
        workspace_id: data.workspaceId,
        user_id: context.userId,
        inbox_id: data.inboxId ?? null,
        etapa: "classificacao",
        modelo: CHAT_MODEL,
        latencia_ms: Date.now() - started,
        status: "erro",
        erro: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
