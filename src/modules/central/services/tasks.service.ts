import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";

import type {
  RecurrenceRule,
  Task,
  TaskInput,
  TaskRow,
  TaskStatus,
} from "../types/central.types";

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    criado_por: row.criado_por,
    responsavel_id: row.responsavel_id,
    titulo: row.titulo,
    descricao: row.descricao,
    categoria: row.categoria,
    status: row.status,
    prioridade: row.prioridade,
    origem: row.origem,
    origem_ref_tipo: row.origem_ref_tipo,
    origem_ref_id: row.origem_ref_id,
    modulo_relacionado: row.modulo_relacionado,
    projeto: row.projeto,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    prazo: row.prazo,
    observacoes: row.observacoes,
    recurrence_rule: (row.recurrence_rule as RecurrenceRule | null) ?? null,
    recurrence_parent_id: row.recurrence_parent_id,
    ordem: row.ordem,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT = "*";

export async function listTasks(workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("workspace_id", workspaceId)
    .order("data", { ascending: true, nullsFirst: false })
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTask);
}

export async function getTask(workspaceId: string, id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToTask(data as TaskRow) : null;
}

export async function createTask(
  workspaceId: string,
  userId: string,
  input: TaskInput,
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      criado_por: userId,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      categoria: input.categoria,
      status: input.status ?? "pendente",
      prioridade: input.prioridade,
      origem: input.origem ?? "manual",
      origem_ref_tipo: input.origem_ref_tipo ?? null,
      origem_ref_id: input.origem_ref_id ?? null,
      modulo_relacionado: input.modulo_relacionado ?? null,
      projeto: input.projeto ?? null,
      responsavel_id: input.responsavel_id ?? userId,
      data: input.data ?? null,
      hora_inicio: input.hora_inicio ?? null,
      hora_fim: input.hora_fim ?? null,
      prazo: input.prazo ?? null,
      observacoes: input.observacoes ?? null,
      recurrence_rule: (input.recurrence_rule as unknown as Json) ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToTask(data as TaskRow);
}

export async function updateTask(
  workspaceId: string,
  id: string,
  patch: Partial<TaskInput>,
): Promise<Task> {
  const payload: TablesUpdate<"tasks"> = { ...patch } as TablesUpdate<"tasks">;
  if ("recurrence_rule" in patch) {
    payload.recurrence_rule = (patch.recurrence_rule as unknown as Json) ?? null;
  }
  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToTask(data as TaskRow);
}

export async function setTaskStatus(
  workspaceId: string,
  id: string,
  status: TaskStatus,
): Promise<Task> {
  const patch: Record<string, unknown> = { status };
  if (status === "concluida") patch.completed_at = new Date().toISOString();
  if (status !== "concluida") patch.completed_at = null;
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToTask(data as TaskRow);
}

export async function setTaskPriority(
  workspaceId: string,
  id: string,
  prioridade: Task["prioridade"],
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ prioridade })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToTask(data as TaskRow);
}

/** Adia a tarefa em N dias (ou usa nova data explícita). */
export async function snoozeTask(
  workspaceId: string,
  id: string,
  next: { data?: string; days?: number },
): Promise<Task> {
  let nextData = next.data;
  if (!nextData && next.days) {
    const current = await getTask(workspaceId, id);
    const base = current?.data ? new Date(`${current.data}T00:00:00`) : new Date();
    base.setDate(base.getDate() + next.days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    nextData = `${y}-${m}-${d}`;
  }
  const { data, error } = await supabase
    .from("tasks")
    .update({ data: nextData ?? null })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToTask(data as TaskRow);
}

export async function deleteTask(workspaceId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}
