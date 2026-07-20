import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import { createLead, getLead, listLeads, updateLead } from "../services/leads.service";
import type { LeadInput } from "../types/leads.types";

/**
 * Query keys escopadas por workspace — padrão multi-tenant.
 * Formato: ["leads", workspaceId] e ["lead", workspaceId, id].
 */
export const leadsKeys = {
  all: (workspaceId: string) => ["leads", workspaceId] as const,
  detail: (workspaceId: string, id: string) => ["lead", workspaceId, id] as const,
};

export function leadsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: leadsKeys.all(workspaceId),
    queryFn: listLeads,
  });
}

export function leadQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: leadsKeys.detail(workspaceId, id),
    queryFn: () => getLead(id),
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
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: (input: LeadInput) => createLead(input),
    onSuccess: (created) => invalidate(created.id),
  });
}

export function useUpdateLead() {
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LeadInput }) => updateLead(id, input),
    onSuccess: (updated) => invalidate(updated.id),
  });
}
