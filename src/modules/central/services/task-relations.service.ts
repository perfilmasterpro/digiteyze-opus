/**
 * Relações de uma task: checklist, comentários e dependências.
 * Anexos ficam em attachments-storage.service.ts.
 */

import { supabase } from "@/integrations/supabase/client";

import type {
  ChecklistItem,
  ChecklistRow,
  CommentRow,
  DependencyRow,
  Task,
  TaskComment,
  TaskDependency,
} from "../types/central.types";

/* ─────────── Checklist ─────────── */

function rowToChecklist(row: ChecklistRow): ChecklistItem {
  return {
    id: row.id,
    task_id: row.task_id,
    workspace_id: row.workspace_id,
    titulo: row.titulo,
    done: row.done,
    ordem: row.ordem,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listChecklist(
  workspaceId: string,
  taskId: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToChecklist(r as ChecklistRow));
}

export async function addChecklistItem(
  workspaceId: string,
  taskId: string,
  titulo: string,
): Promise<ChecklistItem> {
  // ordem = próximo
  const { count } = await supabase
    .from("task_checklist_items")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId);
  const { data, error } = await supabase
    .from("task_checklist_items")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      titulo: titulo.trim(),
      ordem: count ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToChecklist(data as ChecklistRow);
}

export async function toggleChecklistItem(
  workspaceId: string,
  id: string,
  done: boolean,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .update({ done })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToChecklist(data as ChecklistRow);
}

export async function updateChecklistItem(
  workspaceId: string,
  id: string,
  titulo: string,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .update({ titulo: titulo.trim() })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToChecklist(data as ChecklistRow);
}

export async function removeChecklistItem(
  workspaceId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_checklist_items")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

/* ─────────── Comments ─────────── */

function rowToComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    task_id: row.task_id,
    workspace_id: row.workspace_id,
    autor_id: row.autor_id,
    autor_nome: row.autor_nome,
    corpo: row.corpo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listComments(
  workspaceId: string,
  taskId: string,
): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToComment(r as CommentRow));
}

export async function addComment(
  workspaceId: string,
  taskId: string,
  autorId: string,
  autorNome: string,
  corpo: string,
): Promise<TaskComment> {
  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      autor_id: autorId,
      autor_nome: autorNome,
      corpo: corpo.trim(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToComment(data as CommentRow);
}

export async function removeComment(
  workspaceId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_comments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

/* ─────────── Dependencies ─────────── */

function rowToDependency(row: DependencyRow): TaskDependency {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    task_id: row.task_id,
    depends_on_task_id: row.depends_on_task_id,
    created_at: row.created_at,
  };
}

export async function listDependencies(
  workspaceId: string,
  taskId: string,
): Promise<{ blockedBy: TaskDependency[]; blocks: TaskDependency[] }> {
  const [{ data: blockedByRaw, error: e1 }, { data: blocksRaw, error: e2 }] =
    await Promise.all([
      supabase
        .from("task_dependencies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("task_id", taskId),
      supabase
        .from("task_dependencies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("depends_on_task_id", taskId),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    blockedBy: (blockedByRaw ?? []).map((r) => rowToDependency(r as DependencyRow)),
    blocks: (blocksRaw ?? []).map((r) => rowToDependency(r as DependencyRow)),
  };
}

export async function addDependency(
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
): Promise<TaskDependency> {
  if (taskId === dependsOnTaskId) {
    throw new Error("Uma tarefa não pode depender de si mesma");
  }
  // Previne ciclo simples: se dependsOnTaskId já depende (direta/indiretamente) de taskId, recusa.
  const cycle = await wouldCreateCycle(workspaceId, taskId, dependsOnTaskId);
  if (cycle) throw new Error("Essa dependência criaria um ciclo entre as tarefas");
  const { data, error } = await supabase
    .from("task_dependencies")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToDependency(data as DependencyRow);
}

async function wouldCreateCycle(
  workspaceId: string,
  taskId: string,
  dependsOnTaskId: string,
): Promise<boolean> {
  // BFS a partir de dependsOnTaskId seguindo suas dependências. Se alcançar taskId → ciclo.
  const visited = new Set<string>();
  const queue = [dependsOnTaskId];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const { data } = await supabase
      .from("task_dependencies")
      .select("depends_on_task_id")
      .eq("workspace_id", workspaceId)
      .eq("task_id", current);
    for (const r of data ?? []) queue.push((r as { depends_on_task_id: string }).depends_on_task_id);
  }
  return false;
}

export async function removeDependency(
  workspaceId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("task_dependencies")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

/** Retorna true quando todas as dependências estão concluídas (ou não há). */
export function isTaskUnblocked(
  blockedBy: TaskDependency[],
  taskById: Map<string, Task>,
): boolean {
  return blockedBy.every((d) => {
    const t = taskById.get(d.depends_on_task_id);
    return !t || t.status === "concluida" || t.status === "cancelada";
  });
}
