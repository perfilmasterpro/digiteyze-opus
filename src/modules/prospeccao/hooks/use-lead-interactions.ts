import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { recordLeadEvent } from "../services/lead-events.service";
import {
  createLeadInteraction,
  listLeadInteractions,
} from "../services/lead-interactions.service";
import type { LeadInteractionInput } from "../types/entities.types";
import { leadEventsKeys } from "./use-lead-events";

export const leadInteractionsKeys = {
  all: (workspaceId: string, leadId: string) =>
    ["lead-interactions", workspaceId, leadId] as const,
};

export function leadInteractionsQueryOptions(workspaceId: string, leadId: string) {
  return queryOptions({
    queryKey: leadInteractionsKeys.all(workspaceId, leadId),
    queryFn: () => listLeadInteractions(workspaceId, leadId),
    staleTime: 30_000,
  });
}

export function useLeadInteractions(leadId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...leadInteractionsQueryOptions(workspaceId, leadId),
    enabled: Boolean(leadId),
  });
}

export function useCreateLeadInteraction(leadId: string) {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadInteractionInput) =>
      createLeadInteraction(workspaceId, leadId, { responsavel_id: userId, ...input }),
    onSuccess: async (created) => {
      await recordLeadEvent({
        workspaceId,
        leadId,
        tipo: "interaction_added",
        descricao: `${created.tipo}: ${created.descricao.slice(0, 80)}`,
        created_by: userId,
        created_by_name: getCurrentUserName(),
      });
      qc.invalidateQueries({ queryKey: leadInteractionsKeys.all(workspaceId, leadId) });
      qc.invalidateQueries({ queryKey: leadEventsKeys.all(workspaceId, leadId) });
    },
  });
}
