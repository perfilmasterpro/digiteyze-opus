import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import {
  createLead,
  getLead,
  listLeads,
  updateLead,
  updateLeadStatus,
} from "../services/leads.service";
import type { LeadInput, LeadStatus } from "../types/leads.types";

/**
 * Query keys escopadas por workspace — padrão multi-tenant.
 * Formato: ["leads", workspaceId] e ["lead", workspaceId, id].
 */
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
    if (id) qc.invalidateQueries({ queryKey: leadsKeys.detail(workspaceId, id) });
  };
}

export function useCreateLead() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: (input: LeadInput) => createLead(workspaceId, input),
    onSuccess: (created) => invalidate(created.id),
  });
}

export function useUpdateLead() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeadInput }) =>
      updateLead(workspaceId, id, input),
    onSuccess: (updated) => invalidate(updated.id),
  });
}

export function useUpdateLeadStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      updateLeadStatus(workspaceId, id, status),
    onSuccess: (updated) => invalidate(updated.id),
  });
}
