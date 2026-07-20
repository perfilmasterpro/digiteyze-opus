import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { recordLeadEvent } from "../services/lead-events.service";
import {
  createLead,
  getLead,
  listLeads,
  updateLead,
  updateLeadStatus,
} from "../services/leads.service";
import type { LeadInput, LeadStatus } from "../types/leads.types";

export const leadsKeys = {
  all: (workspaceId: string) => ["leads", workspaceId] as const,
  detail: (workspaceId: string, id: string) => ["lead", workspaceId, id] as const,
};

const DEFAULT_STALE_TIME = 30_000;

export function leadsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: leadsKeys.all(workspaceId),
    queryFn: () => listLeads(workspaceId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function leadQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: leadsKeys.detail(workspaceId, id),
    queryFn: () => getLead(workspaceId, id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useLeads() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(leadsQueryOptions(workspaceId));
}

export function useLead(id: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...leadQueryOptions(workspaceId, id),
    enabled: Boolean(id),
  });
}

function useInvalidateLeads() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: leadsKeys.all(workspaceId) });
    if (id) {
      qc.invalidateQueries({ queryKey: leadsKeys.detail(workspaceId, id) });
      qc.invalidateQueries({ queryKey: ["lead-events", workspaceId, id] });
    }
  };
}

export function useCreateLead() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: (input: LeadInput) => createLead(workspaceId, input),
    onSuccess: async (created) => {
      await recordLeadEvent({
        workspaceId,
        leadId: created.id,
        tipo: "created",
        status_novo: created.status,
        descricao: `Lead "${created.nome_empresa}" criado`,
        created_by: userId,
        created_by_name: getCurrentUserName(),
      });
      invalidate(created.id);
    },
  });
}

export function useUpdateLead() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeadInput }) =>
      updateLead(workspaceId, id, input),
    onSuccess: async (updated) => {
      await recordLeadEvent({
        workspaceId,
        leadId: updated.id,
        tipo: "updated",
        descricao: "Dados do lead atualizados",
        created_by: userId,
        created_by_name: getCurrentUserName(),
      });
      invalidate(updated.id);
    },
  });
}

export function useUpdateLeadStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const before = await getLead(workspaceId, id);
      const updated = await updateLeadStatus(workspaceId, id, status);
      return { updated, before };
    },
    onSuccess: async ({ updated, before }) => {
      await recordLeadEvent({
        workspaceId,
        leadId: updated.id,
        tipo: "status_changed",
        status_anterior: before?.status,
        status_novo: updated.status,
        created_by: userId,
        created_by_name: getCurrentUserName(),
      });
      invalidate(updated.id);
    },
  });
}
