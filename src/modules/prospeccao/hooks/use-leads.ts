import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { empresaEventsKeys, publishEmpresaEvent } from "@/modules/empresas";
import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { recordLeadEvent } from "../services/lead-events.service";
import {
  createLead,
  getLead,
  listLeads,
  updateLead,
  updateLeadStatus,
  updateLeadsProspeccaoStatus,
} from "../services/leads.service";
import {
  LEAD_STATUS_LABEL,
  type LeadInput,
  type LeadStatus,
} from "../types/leads.types";

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
  return (id?: string, empresaId?: string) => {
    qc.invalidateQueries({ queryKey: leadsKeys.all(workspaceId) });
    if (id) {
      qc.invalidateQueries({ queryKey: leadsKeys.detail(workspaceId, id) });
      qc.invalidateQueries({ queryKey: ["lead-events", workspaceId, id] });
    }
    if (empresaId) {
      qc.invalidateQueries({ queryKey: empresaEventsKeys.all(workspaceId, empresaId) });
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
      if (created.empresa_id) {
        await publishEmpresaEvent({
          workspaceId,
          empresaId: created.empresa_id,
          modulo: "prospeccao",
          tipo: "lead.created",
          titulo: `Lead "${created.nome_empresa}" criado`,
          createdBy: userId,
          createdByName: getCurrentUserName(),
          payload: { lead_id: created.id },
        });
      }
      invalidate(created.id, created.empresa_id);
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
      if (updated.empresa_id) {
        await publishEmpresaEvent({
          workspaceId,
          empresaId: updated.empresa_id,
          modulo: "prospeccao",
          tipo: "lead.updated",
          titulo: `Lead "${updated.nome_empresa}" atualizado`,
          createdBy: userId,
          createdByName: getCurrentUserName(),
          payload: { lead_id: updated.id },
        });
      }
      invalidate(updated.id, updated.empresa_id);
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
      if (updated.empresa_id) {
        const fromLabel = before?.status ? LEAD_STATUS_LABEL[before.status] : "—";
        const toLabel = LEAD_STATUS_LABEL[updated.status];
        await publishEmpresaEvent({
          workspaceId,
          empresaId: updated.empresa_id,
          modulo: "prospeccao",
          tipo: "lead.stage_changed",
          titulo: `Estágio alterado: ${fromLabel} → ${toLabel}`,
          createdBy: userId,
          createdByName: getCurrentUserName(),
          payload: {
            lead_id: updated.id,
            status_anterior: before?.status,
            status_novo: updated.status,
          },
        });
      }
      invalidate(updated.id, updated.empresa_id);
    },
  });
}


export function useUpdateLeadsProspeccaoStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateLeads();
  return useMutation({
    mutationFn: ({ leadIds, emProspeccao }: { leadIds: string[]; emProspeccao: boolean }) =>
      updateLeadsProspeccaoStatus(workspaceId, leadIds, emProspeccao),
    onSuccess: async (updated) => {
      await Promise.all(
        updated.map((lead) =>
          recordLeadEvent({
            workspaceId,
            leadId: lead.id,
            tipo: "updated",
            descricao: lead.em_prospeccao
              ? "Lead adicionado à prospecção ativa"
              : "Lead removido da prospecção ativa",
            created_by: userId,
            created_by_name: getCurrentUserName(),
          }),
        ),
      );
      invalidate();
    },
  });
}
