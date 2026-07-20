import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { recordLeadEvent } from "../services/lead-events.service";
import {
  createLeadTask,
  listLeadTasks,
  updateLeadTaskStatus,
} from "../services/lead-tasks.service";
import type {
  LeadTaskInput,
  LeadTaskStatus,
} from "../types/entities.types";
import { leadEventsKeys } from "./use-lead-events";

export const leadTasksKeys = {
  all: (workspaceId: string, leadId: string) =>
    ["lead-tasks", workspaceId, leadId] as const,
};

export function leadTasksQueryOptions(workspaceId: string, leadId: string) {
  return queryOptions({
    queryKey: leadTasksKeys.all(workspaceId, leadId),
    queryFn: () => listLeadTasks(workspaceId, leadId),
    staleTime: 30_000,
  });
}

export function useLeadTasks(leadId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...leadTasksQueryOptions(workspaceId, leadId),
    enabled: Boolean(leadId),
  });
}

export function useCreateLeadTask(leadId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadTaskInput) =>
      createLeadTask(workspaceId, leadId, { responsavel_id: userId, ...input }),
    onSuccess: async (task) => {
      await recordLeadEvent({
        workspaceId,
        leadId,
        tipo: "task_added",
        descricao: task.titulo,
        created_by: userId,
        created_by_name: getCurrentUserName(),
      });
      qc.invalidateQueries({ queryKey: leadTasksKeys.all(workspaceId, leadId) });
      qc.invalidateQueries({ queryKey: leadEventsKeys.all(workspaceId, leadId) });
    },
  });
}

export function useUpdateLeadTaskStatus(leadId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadTaskStatus }) =>
      updateLeadTaskStatus(workspaceId, id, status),
    onSuccess: async (task) => {
      if (task.status === "concluida") {
        await recordLeadEvent({
          workspaceId,
          leadId,
          tipo: "task_completed",
          descricao: task.titulo,
          created_by: userId,
          created_by_name: getCurrentUserName(),
        });
      }
      qc.invalidateQueries({ queryKey: leadTasksKeys.all(workspaceId, leadId) });
      qc.invalidateQueries({ queryKey: leadEventsKeys.all(workspaceId, leadId) });
    },
  });
}
