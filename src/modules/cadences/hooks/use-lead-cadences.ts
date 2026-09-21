import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";
import { getLead } from "@/modules/prospeccao/services/leads.service";

import {
  advanceLeadCadence,
  finishLeadCadence,
  getActiveLeadCadence,
  listLeadCadences,
  pauseLeadCadence,
  resumeLeadCadence,
  startCadenceForLead,
} from "../services/lead-cadences.service";
import {
  executeCadenceStep,
  recordCadenceStepFailure,
  recordCadenceStepSuccess,
} from "../services/cadence-step-runner";
import type { LeadCadence } from "../types/cadences.types";

export const leadCadencesKeys = {
  byLead: (ws: string, leadId: string) => ["lead-cadences", ws, leadId] as const,
  active: (ws: string, leadId: string) => ["lead-cadences", ws, leadId, "active"] as const,
};

export function useLeadCadences(leadId: string) {
  const ws = useCurrentWorkspaceId();
  return useQuery({
    queryKey: leadCadencesKeys.byLead(ws, leadId),
    queryFn: () => listLeadCadences(ws, leadId),
    enabled: Boolean(leadId),
    staleTime: 15_000,
  });
}

export function useActiveLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  return useQuery({
    queryKey: leadCadencesKeys.active(ws, leadId),
    queryFn: () => getActiveLeadCadence(ws, leadId),
    enabled: Boolean(leadId),
    staleTime: 15_000,
  });
}

function useInvalidateLead(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: leadCadencesKeys.byLead(ws, leadId) });
    qc.invalidateQueries({ queryKey: leadCadencesKeys.active(ws, leadId) });
  };
}

/**
 * Executa a etapa atual do vínculo e dispara ao ZapZap.
 * Em caso de falha, pausa a cadência, registra o erro e propaga a mensagem.
 */
async function runStepOrPause(
  ws: string,
  leadId: string,
  cadence: LeadCadence,
): Promise<void> {
  try {
    const result = await executeCadenceStep(ws, leadId, cadence);
    if (!result.skipped && result.step) {
      await recordCadenceStepSuccess(ws, leadId, result.etapa, result.step.nome);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao executar a etapa da cadência.";
    await recordCadenceStepFailure(ws, leadId, cadence.etapa_atual, message);
    try {
      await pauseLeadCadence(ws, leadId, cadence.id);
    } catch {
      // mantém o erro original como causa exibida ao usuário
    }
    throw new Error(message);
  }
}

export function useStartLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const invalidate = useInvalidateLead(leadId);

  return useMutation({
    mutationFn: async (cadenceId: string) => {
      const lead = await getLead(ws, leadId);

      if (!lead) {
        throw new Error("Lead não encontrado.");
      }

      const cadence = await startCadenceForLead(ws, leadId, cadenceId);
      await runStepOrPause(ws, leadId, cadence);

      return cadence;
    },
    onSuccess: invalidate,
  });
}

export function useAdvanceLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const invalidate = useInvalidateLead(leadId);
  return useMutation({
    mutationFn: async (leadCadenceId: string) => {
      const cadence = await advanceLeadCadence(ws, leadId, leadCadenceId);

      // Cadência concluída (não há próxima etapa) → nada a enviar
      if (cadence.status === "concluida") return cadence;

      await runStepOrPause(ws, leadId, cadence);
      return cadence;
    },
    onSuccess: invalidate,
  });
}

export function usePauseLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const invalidate = useInvalidateLead(leadId);
  return useMutation({
    mutationFn: (leadCadenceId: string) => pauseLeadCadence(ws, leadId, leadCadenceId),
    onSuccess: invalidate,
  });
}

export function useResumeLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const invalidate = useInvalidateLead(leadId);
  return useMutation({
    mutationFn: (leadCadenceId: string) => resumeLeadCadence(ws, leadId, leadCadenceId),
    onSuccess: invalidate,
  });
}

export function useFinishLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const invalidate = useInvalidateLead(leadId);
  return useMutation({
    mutationFn: (leadCadenceId: string) => finishLeadCadence(ws, leadId, leadCadenceId),
    onSuccess: invalidate,
  });
}
