import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCurrentUserId,
  getCurrentUserName,
  useCurrentUserId,
  useCurrentWorkspaceId,
} from "@/lib/workspace";

import {
  addChecklistItem,
  addComment,
  addDependency,
  listChecklist,
  listComments,
  listDependencies,
  removeChecklistItem,
  removeComment,
  removeDependency,
  toggleChecklistItem,
  updateChecklistItem,
} from "../services/task-relations.service";
import {
  deleteAttachment,
  listAttachments,
  uploadAttachment,
} from "../services/attachments.service";
import type { TaskAttachment } from "../types/central.types";
import { tasksKeys } from "./use-tasks";

/* ─────────── Checklist ─────────── */

export function useChecklist(taskId: string | undefined) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: ["task-checklist", workspaceId, taskId],
    queryFn: () => (taskId ? listChecklist(workspaceId, taskId) : Promise.resolve([])),
    enabled: Boolean(taskId),
  });
}

export function useAddChecklistItem(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (titulo: string) => addChecklistItem(workspaceId, taskId, titulo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklist", workspaceId, taskId] });
    },
  });
}

export function useToggleChecklistItem(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      toggleChecklistItem(workspaceId, id, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklist", workspaceId, taskId] });
    },
  });
}

export function useUpdateChecklistItem(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, titulo }: { id: string; titulo: string }) =>
      updateChecklistItem(workspaceId, id, titulo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklist", workspaceId, taskId] });
    },
  });
}

export function useRemoveChecklistItem(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeChecklistItem(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-checklist", workspaceId, taskId] });
    },
  });
}

/* ─────────── Comments ─────────── */

export function useComments(taskId: string | undefined) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: ["task-comments", workspaceId, taskId],
    queryFn: () => (taskId ? listComments(workspaceId, taskId) : Promise.resolve([])),
    enabled: Boolean(taskId),
  });
}

export function useAddComment(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (corpo: string) =>
      addComment(workspaceId, taskId, userId, getCurrentUserName(), corpo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", workspaceId, taskId] });
    },
  });
}

export function useRemoveComment(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeComment(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", workspaceId, taskId] });
    },
  });
}

/* ─────────── Dependencies ─────────── */

export function useDependencies(taskId: string | undefined) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: ["task-deps", workspaceId, taskId],
    queryFn: () =>
      taskId
        ? listDependencies(workspaceId, taskId)
        : Promise.resolve({ blockedBy: [], blocks: [] }),
    enabled: Boolean(taskId),
  });
}

export function useAddDependency(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dependsOnTaskId: string) =>
      addDependency(workspaceId, taskId, dependsOnTaskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-deps", workspaceId, taskId] });
      qc.invalidateQueries({ queryKey: tasksKeys.all(workspaceId) });
    },
  });
}

export function useRemoveDependency(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeDependency(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-deps", workspaceId, taskId] });
    },
  });
}

/* ─────────── Attachments ─────────── */

export function useAttachments(taskId: string | undefined) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: ["task-attachments", workspaceId, taskId],
    queryFn: () => (taskId ? listAttachments(workspaceId, taskId) : Promise.resolve([])),
    enabled: Boolean(taskId),
  });
}

export function useUploadAttachment(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      uploadAttachment(workspaceId, taskId, getCurrentUserId(), file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-attachments", workspaceId, taskId] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachment: TaskAttachment) => deleteAttachment(workspaceId, attachment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-attachments", workspaceId, taskId] });
    },
  });
}
