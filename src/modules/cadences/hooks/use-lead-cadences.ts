import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";
import { supabase } from "@/integrations/supabase/client";
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        await pauseLeadCadence(ws, leadId, cadence.id);
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const response = await fetch("/api/prospeccao/zapzap-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspace_id: ws,
          lead_id: leadId,
          empresa: (lead as any).empresa ?? (lead as any).nome_empresa,
          nome: (lead as any).nome,
          telefone: (lead as any).telefone,
          whatsapp: (lead as any).whatsapp,
          cadence_id: cadence.cadence_id,
          lead_cadence_id: cadence.id,
          etapa: cadence.etapa_atual,
        }),
      });

      if (!response.ok) {
        let message = "Não foi possível iniciar o Flow do ZapZap.";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string") message = payload.error;
        } catch {
          // mantém a mensagem padrão
        }

        await pauseLeadCadence(ws, leadId, cadence.id);
        throw new Error(message);
      }

      return cadence;
    },
    onSuccess: invalidate,
  });
}

export function useAdvanceLeadCadence(leadId: string) {
  const ws = useCurrentWorkspaceId();
  const invalidate = useInvalidateLead(leadId);
  return useMutation({
    mutationFn: (leadCadenceId: string) => advanceLeadCadence(ws, leadId, leadCadenceId),
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
