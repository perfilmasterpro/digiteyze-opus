import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { empresaEventsKeys, publishEmpresaEvent } from "@/modules/empresas";
import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { recordLeadEvent } from "../services/lead-events.service";
import {
  createLeadTask,
  listLeadTasks,
  updateLeadTaskStatus,
} from "../services/lead-tasks.service";
import { getLead } from "../services/leads.service";
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
      const lead = await getLead(workspaceId, leadId);
      if (lead?.empresa_id) {
        await publishEmpresaEvent({
          workspaceId,
          empresaId: lead.empresa_id,
          modulo: "prospeccao",
          tipo: "lead.task_created",
          titulo: `Tarefa criada: ${task.titulo}`,
          descricao: task.data ? `Prazo: ${task.data}` : undefined,
          createdBy: userId,
          createdByName: getCurrentUserName(),
          payload: { lead_id: leadId, task_id: task.id, prioridade: task.prioridade },
        });
        qc.invalidateQueries({ queryKey: empresaEventsKeys.all(workspaceId, lead.empresa_id) });
      }
      qc.invalidateQueries({ queryKey: leadTasksKeys.all(workspaceId, leadId) });
      qc.invalidateQueries({ queryKey: leadEventsKeys.all(workspaceId, leadId) });
      // Sincroniza com a Central de Tarefas (mesma linha na tabela `tasks`).
      qc.invalidateQueries({ queryKey: ["central-tasks", workspaceId] });
      qc.invalidateQueries({ queryKey: ["central-indicators", workspaceId] });
      qc.invalidateQueries({ queryKey: ["central-summary", workspaceId] });
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
      qc.invalidateQueries({ queryKey: ["central-tasks", workspaceId] });
      qc.invalidateQueries({ queryKey: ["central-indicators", workspaceId] });
      qc.invalidateQueries({ queryKey: ["central-summary", workspaceId] });
    },
  });
}
