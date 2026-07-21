import { supabase } from "@/integrations/supabase/client";

import type { AttachmentRow, TaskAttachment } from "../types/central.types";

const BUCKET = "task-attachments";

function rowToAttachment(row: AttachmentRow): TaskAttachment {
  return {
    id: row.id,
    task_id: row.task_id,
    workspace_id: row.workspace_id,
    nome: row.nome,
    tipo_mime: row.tipo_mime,
    tamanho_bytes: row.tamanho_bytes,
    storage_path: row.storage_path,
    criado_por: row.criado_por,
    created_at: row.created_at,
  };
}

export async function listAttachments(
  workspaceId: string,
  taskId: string,
): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToAttachment(r as AttachmentRow));
}

function makePath(workspaceId: string, taskId: string, filename: string) {
  const cleanName = filename.replace(/[^\w.\-]+/g, "_");
  const uuid = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return `${workspaceId}/${taskId}/${uuid}-${cleanName}`;
}

export async function uploadAttachment(
  workspaceId: string,
  taskId: string,
  userId: string,
  file: File,
): Promise<TaskAttachment> {
  const path = makePath(workspaceId, taskId, file.name);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      nome: file.name,
      tipo_mime: file.type || null,
      tamanho_bytes: file.size,
      storage_path: path,
      criado_por: userId,
    })
    .select("*")
    .single();
  if (error) {
    // rollback storage
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return rowToAttachment(data as AttachmentRow);
}

export async function getAttachmentSignedUrl(
  storagePath: string,
  expiresIn = 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAttachment(
  workspaceId: string,
  attachment: TaskAttachment,
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", attachment.id);
  if (error) throw error;
}
