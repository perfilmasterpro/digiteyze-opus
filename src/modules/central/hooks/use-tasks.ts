import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCurrentUserId,
  getCurrentUserName,
  useCurrentUserId,
  useCurrentWorkspaceId,
} from "@/lib/workspace";

import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  setTaskPriority,
  setTaskStatus,
  snoozeTask,
  updateTask,
} from "../services/tasks.service";
import { spawnNextRecurringTask } from "../services/recurrence.service";
import type { Task, TaskInput, TaskPrioridade, TaskStatus } from "../types/central.types";

export const tasksKeys = {
  all: (workspaceId: string) => ["central-tasks", workspaceId] as const,
  detail: (workspaceId: string, id: string) =>
    ["central-tasks", workspaceId, id] as const,
};

export function tasksQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: tasksKeys.all(workspaceId),
    queryFn: () => listTasks(workspaceId),
    staleTime: 15_000,
  });
}

export function useTasks() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(tasksQueryOptions(workspaceId));
}

export function useTask(id: string | undefined) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: id ? tasksKeys.detail(workspaceId, id) : ["central-tasks", "nil"],
    queryFn: () => (id ? getTask(workspaceId, id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

function invalidateAllTasks(qc: ReturnType<typeof useQueryClient>, workspaceId: string) {
  qc.invalidateQueries({ queryKey: tasksKeys.all(workspaceId) });
  qc.invalidateQueries({ queryKey: ["central-indicators", workspaceId] });
  qc.invalidateQueries({ queryKey: ["central-summary", workspaceId] });
  qc.invalidateQueries({ queryKey: ["ai-suggestions", workspaceId] });
  // Tarefas de lead (ficha do lead) — mantém sincronia bidirecional.
  qc.invalidateQueries({ queryKey: ["lead-tasks", workspaceId] });
}

export function useCreateTask() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(workspaceId, userId, input),
    onSuccess: () => invalidateAllTasks(qc, workspaceId),
  });
}

export function useUpdateTask() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TaskInput> }) =>
      updateTask(workspaceId, id, patch),
    onSuccess: (t) => {
      invalidateAllTasks(qc, workspaceId);
      qc.invalidateQueries({ queryKey: tasksKeys.detail(workspaceId, t.id) });
    },
  });
}

export function useSetTaskStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const updated = await setTaskStatus(workspaceId, id, status);
      // Se marcou como concluída e a tarefa é recorrente, gera a próxima.
      if (status === "concluida" && updated.recurrence_rule) {
        try {
          await spawnNextRecurringTask(workspaceId, getCurrentUserId(), updated);
        } catch (err) {
          console.warn("[central] falha ao gerar próxima recorrência", err);
        }
      }
      return updated;
    },
    onSuccess: (t) => {
      invalidateAllTasks(qc, workspaceId);
      qc.invalidateQueries({ queryKey: tasksKeys.detail(workspaceId, t.id) });
    },
  });
}

export function useSetTaskPriority() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prioridade }: { id: string; prioridade: TaskPrioridade }) =>
      setTaskPriority(workspaceId, id, prioridade),
    onSuccess: () => invalidateAllTasks(qc, workspaceId),
  });
}

export function useSnoozeTask() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, days = 1 }: { id: string; days?: number }) =>
      snoozeTask(workspaceId, id, { days }),
    onSuccess: () => invalidateAllTasks(qc, workspaceId),
  });
}

export function useDeleteTask() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(workspaceId, id),
    onSuccess: () => invalidateAllTasks(qc, workspaceId),
  });
}

// Silence unused import warning: getCurrentUserName may be used by consumers importing this file
void getCurrentUserName;

/** Filtra tarefas por visualização. */
export function filterTasksForView(
  tasks: Task[],
  view: "hoje" | "lista" | "kanban" | "calendario" | "agenda",
  date?: string,
): Task[] {
  const today = date ?? new Date().toISOString().slice(0, 10);
  switch (view) {
    case "hoje":
      return tasks.filter(
        (t) =>
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          (t.data === null || t.data === undefined || t.data <= today),
      );
    case "agenda":
      return tasks.filter(
        (t) => t.data === today && t.hora_inicio && t.status !== "cancelada",
      );
    case "kanban":
      return tasks.filter((t) => t.status !== "cancelada");
    default:
      return tasks;
  }
}
