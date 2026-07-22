import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

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
    mutationFn: (cadenceId: string) => startCadenceForLead(ws, leadId, cadenceId),
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
