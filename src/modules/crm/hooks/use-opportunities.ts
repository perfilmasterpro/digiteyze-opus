import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  empresaEventsKeys,
  publishEmpresaEvent,
  type EmpresaEventType,
} from "@/modules/empresas";
import {
  getCurrentUserName,
  useCurrentUserId,
  useCurrentWorkspaceId,
} from "@/lib/workspace";

import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunity,
  updateOpportunityStatus,
} from "../services/opportunities.service";
import {
  OPPORTUNITY_STATUS_LABEL,
  type Opportunity,
  type OpportunityInput,
  type OpportunityStatus,
} from "../types/opportunities.types";

export const opportunitiesKeys = {
  all: (workspaceId: string) => ["opportunities", workspaceId] as const,
  byEmpresa: (workspaceId: string, empresaId: string) =>
    ["opportunities", workspaceId, "empresa", empresaId] as const,
  detail: (workspaceId: string, id: string) =>
    ["opportunity", workspaceId, id] as const,
};

const DEFAULT_STALE_TIME = 30_000;

export function opportunitiesQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: opportunitiesKeys.all(workspaceId),
    queryFn: () => listOpportunities(workspaceId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function opportunitiesByEmpresaQueryOptions(
  workspaceId: string,
  empresaId: string,
) {
  return queryOptions({
    queryKey: opportunitiesKeys.byEmpresa(workspaceId, empresaId),
    queryFn: () => listOpportunities(workspaceId, empresaId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function opportunityQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: opportunitiesKeys.detail(workspaceId, id),
    queryFn: () => getOpportunity(workspaceId, id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useOpportunities() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(opportunitiesQueryOptions(workspaceId));
}

export function useOpportunitiesByEmpresa(empresaId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...opportunitiesByEmpresaQueryOptions(workspaceId, empresaId),
    enabled: Boolean(empresaId),
  });
}

export function useOpportunity(id: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...opportunityQueryOptions(workspaceId, id),
    enabled: Boolean(id),
  });
}

/**
 * Invalidação abrangente: lista global, lista da empresa, detalhe e
 * timeline de eventos da empresa afetada.
 */
function useInvalidateOpportunities() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return (empresaId?: string, oppId?: string) => {
    qc.invalidateQueries({ queryKey: opportunitiesKeys.all(workspaceId) });
    if (empresaId) {
      qc.invalidateQueries({
        queryKey: opportunitiesKeys.byEmpresa(workspaceId, empresaId),
      });
      qc.invalidateQueries({
        queryKey: empresaEventsKeys.all(workspaceId, empresaId),
      });
    }
    if (oppId) {
      qc.invalidateQueries({ queryKey: opportunitiesKeys.detail(workspaceId, oppId) });
    }
  };
}

async function publish(
  workspaceId: string,
  empresaId: string,
  tipo: EmpresaEventType,
  titulo: string,
  createdBy: string,
  descricao?: string,
  payload?: Record<string, unknown>,
) {
  await publishEmpresaEvent({
    workspaceId,
    empresaId,
    modulo: "comercial",
    tipo,
    titulo,
    descricao,
    createdBy,
    createdByName: getCurrentUserName(),
    payload,
  });
}

export function useCreateOpportunity() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateOpportunities();
  return useMutation({
    mutationFn: async (input: OpportunityInput) => {
      const opp = await createOpportunity(workspaceId, input);
      await publish(
        workspaceId,
        opp.empresa_id,
        "opportunity.created",
        `Oportunidade criada: ${opp.nome}`,
        userId,
        `Valor estimado ${opp.valor_estimado.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })} · ${OPPORTUNITY_STATUS_LABEL[opp.status]}`,
        { opportunity_id: opp.id, status: opp.status },
      );
      return opp;
    },
    onSuccess: (opp) => invalidate(opp.empresa_id, opp.id),
  });
}

export function useUpdateOpportunity() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateOpportunities();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: OpportunityInput }) => {
      const opp = await updateOpportunity(workspaceId, id, input);
      await publish(
        workspaceId,
        opp.empresa_id,
        "opportunity.updated",
        `Oportunidade atualizada: ${opp.nome}`,
        userId,
        undefined,
        { opportunity_id: opp.id },
      );
      return opp;
    },
    onSuccess: (opp) => invalidate(opp.empresa_id, opp.id),
  });
}

export function useUpdateOpportunityStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateOpportunities();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      previousStatus,
    }: {
      id: string;
      status: OpportunityStatus;
      previousStatus?: OpportunityStatus;
    }) => {
      const opp = await updateOpportunityStatus(workspaceId, id, status);
      const tipo: EmpresaEventType =
        status === "ganho"
          ? "opportunity.won"
          : status === "perdido"
            ? "opportunity.lost"
            : "opportunity.stage_changed";
      const titulo =
        status === "ganho"
          ? `Oportunidade ganha: ${opp.nome}`
          : status === "perdido"
            ? `Oportunidade perdida: ${opp.nome}`
            : `Estágio: ${OPPORTUNITY_STATUS_LABEL[status]} — ${opp.nome}`;
      await publish(
        workspaceId,
        opp.empresa_id,
        tipo,
        titulo,
        userId,
        previousStatus
          ? `De ${OPPORTUNITY_STATUS_LABEL[previousStatus]} para ${OPPORTUNITY_STATUS_LABEL[status]}`
          : undefined,
        { opportunity_id: opp.id, from: previousStatus, to: status },
      );
      return opp;
    },
    onSuccess: (opp) => invalidate(opp.empresa_id, opp.id),
  });
}

export function useDeleteOpportunity() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateOpportunities();
  return useMutation({
    mutationFn: async ({ id, empresaId }: { id: string; empresaId: string }) => {
      await deleteOpportunity(workspaceId, id);
      return { id, empresaId };
    },
    onSuccess: ({ empresaId, id }) => invalidate(empresaId, id),
  });
}

/** Utilitário puro — KPIs a partir de um conjunto de oportunidades. */
export function computeOpportunityKpis(opps: Opportunity[]) {
  const total = opps.reduce((sum, o) => sum + (o.valor_estimado || 0), 0);
  const won = opps.filter((o) => o.status === "ganho");
  const lost = opps.filter((o) => o.status === "perdido");
  const closed = won.length + lost.length;
  return {
    pipelineTotal: total,
    valorGanho: won.reduce((s, o) => s + (o.valor_estimado || 0), 0),
    valorPerdido: lost.reduce((s, o) => s + (o.valor_estimado || 0), 0),
    quantidade: opps.length,
    ganhos: won.length,
    perdas: lost.length,
    taxaConversao: closed > 0 ? won.length / closed : 0,
  };
}
