/**
 * Serviços do módulo Inbox IA — CRUD dos rascunhos, upload de áudio
 * e conversão do rascunho em entidades de outros módulos (Central).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";

import { createTask } from "@/modules/central/services/tasks.service";
import { addChecklistItem } from "@/modules/central/services/task-relations.service";

import {
  rowToInboxItem,
  type InboxCaptureInput,
  type InboxItem,
  type InboxRow,
  type InboxStatus,
  type InboxSuggestion,
  type InboxTipo,
} from "../types/inbox.types";

const AUDIO_BUCKET = "inbox-audio";

export async function listInbox(workspaceId: string): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("inbox_ai")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToInboxItem(r as InboxRow));
}

export async function getInboxItem(
  workspaceId: string,
  id: string,
): Promise<InboxItem | null> {
  const { data, error } = await supabase
    .from("inbox_ai")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToInboxItem(data as InboxRow) : null;
}

export async function createCapture(
  workspaceId: string,
  userId: string,
  input: InboxCaptureInput,
): Promise<InboxItem> {
  const { data, error } = await supabase
    .from("inbox_ai")
    .insert({
      workspace_id: workspaceId,
      criado_por: userId,
      origem: input.origem,
      origem_detalhe: input.origem_detalhe ?? null,
      conteudo_raw: input.conteudo_raw,
      tipo_sugerido: input.tipo_sugerido ?? null,
      titulo: input.titulo ?? null,
      prioridade: input.prioridade ?? null,
      status: "capturado" as InboxStatus,

    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToInboxItem(data as InboxRow);
}

export async function updateInboxItem(
  workspaceId: string,
  id: string,
  patch: TablesUpdate<"inbox_ai">,
): Promise<InboxItem> {
  const { data, error } = await supabase
    .from("inbox_ai")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToInboxItem(data as InboxRow);
}

/** Salva a sugestão da IA no rascunho (nada é criado em outros módulos). */
export async function applySuggestion(
  workspaceId: string,
  id: string,
  suggestion: InboxSuggestion,
): Promise<InboxItem> {
  return updateInboxItem(workspaceId, id, {
    status: "sugerido",
    tipo_sugerido: suggestion.tipo,
    titulo: suggestion.titulo,
    descricao: suggestion.descricao,
    categoria: suggestion.categoria,
    prioridade: suggestion.prioridade,
    prazo_sugerido: suggestion.prazo,
    projeto_sugerido: suggestion.projeto,
    proximas_acoes: suggestion.proximas_acoes as unknown as Json,
    confianca: suggestion.confianca,
    ai_payload: suggestion as unknown as Json,
  });
}

export async function markInboxError(
  workspaceId: string,
  id: string,
  conteudo?: string,
): Promise<InboxItem> {
  return updateInboxItem(workspaceId, id, {
    status: "erro",
    ...(conteudo ? { conteudo_raw: conteudo } : {}),
  });
}

export async function discardInboxItem(
  workspaceId: string,
  id: string,
): Promise<InboxItem> {
  return updateInboxItem(workspaceId, id, { status: "descartado" });
}

export async function deleteInboxItem(workspaceId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("inbox_ai")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

/* ─────────── Áudio ─────────── */

export async function uploadCaptureAudio(
  userId: string,
  blob: Blob,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.wav`;
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, { contentType: "audio/wav", upsert: false });
  if (error) throw error;
  return path;
}

export async function getAudioUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ─────────── Conversão do Rascunho Inteligente ─────────── */

export interface ConvertDraftInput {
  tipo: InboxTipo;
  titulo: string;
  descricao?: string | null;
  categoria: InboxItem["categoria"];
  prioridade: InboxItem["prioridade"];
  prazo?: string | null;
  projeto?: string | null;
  proximas_acoes?: string[];
  correcoes?: Record<string, unknown>;
}

/**
 * Converte o rascunho em uma tarefa da Central (tipos tarefa/projeto/lembrete/ideia)
 * ou apenas registra a nota. Só é chamada por ação explícita do usuário.
 */
export async function convertDraft(
  workspaceId: string,
  userId: string,
  item: InboxItem,
  input: ConvertDraftInput,
): Promise<InboxItem> {
  let convertidoId: string | null = null;

  if (input.tipo !== "nota") {
    const task = await createTask(workspaceId, userId, {
      titulo: input.titulo,
      descricao: input.descricao ?? item.conteudo_raw,
      categoria: input.categoria ?? "administrativo",
      prioridade: input.prioridade ?? "media",
      origem: "inbox_ia",
      origem_ref_tipo: "inbox_ai",
      origem_ref_id: item.id,
      modulo_relacionado: "inbox",
      projeto: input.tipo === "projeto" ? (input.projeto ?? input.titulo) : input.projeto,
      prazo: input.prazo ?? null,
      data: input.tipo === "lembrete" ? (input.prazo ?? null) : null,
    });
    convertidoId = task.id;

    for (const acao of input.proximas_acoes ?? []) {
      if (acao.trim()) await addChecklistItem(workspaceId, task.id, acao);
    }
  }

  return updateInboxItem(workspaceId, item.id, {
    status: "aprovado",
    tipo_confirmado: input.tipo,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    categoria: input.categoria,
    prioridade: input.prioridade,
    prazo_sugerido: input.prazo ?? null,
    projeto_sugerido: input.projeto ?? null,
    proximas_acoes: (input.proximas_acoes ?? []) as unknown as Json,
    correcoes: (input.correcoes ?? {}) as unknown as Json,
    convertido_em_tipo: input.tipo === "nota" ? "nota" : "task",
    convertido_em_id: convertidoId,
  });
}
