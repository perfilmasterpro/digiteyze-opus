import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { empresaEventsKeys, publishEmpresaEvent } from "@/modules/empresas";
import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { recordLeadEvent } from "../services/lead-events.service";
import {
  createLeadInteraction,
  listLeadInteractions,
} from "../services/lead-interactions.service";
import { getLead } from "../services/leads.service";
import {
  LEAD_INTERACTION_TYPE_LABEL,
  type LeadInteractionInput,
} from "../types/entities.types";
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
      const lead = await getLead(workspaceId, leadId);
      if (lead?.empresa_id) {
        await publishEmpresaEvent({
          workspaceId,
          empresaId: lead.empresa_id,
          modulo: "prospeccao",
          tipo: "lead.interaction_created",
          titulo: `${LEAD_INTERACTION_TYPE_LABEL[created.tipo]} registrada`,
          descricao: created.descricao,
          createdBy: userId,
          createdByName: getCurrentUserName(),
          payload: { lead_id: leadId, interaction_id: created.id },
        });
        qc.invalidateQueries({ queryKey: empresaEventsKeys.all(workspaceId, lead.empresa_id) });
      }
      qc.invalidateQueries({ queryKey: leadInteractionsKeys.all(workspaceId, leadId) });
      qc.invalidateQueries({ queryKey: leadEventsKeys.all(workspaceId, leadId) });
    },
  });
}
