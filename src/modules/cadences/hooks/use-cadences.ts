import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import {
  createCadence,
  deleteCadence,
  getCadenceWithSteps,
  listCadences,
  listCadenceSteps,
  updateCadence,
} from "../services/cadences.service";
import type { CadenceInput } from "../types/cadences.types";

export const cadencesKeys = {
  all: (ws: string) => ["cadences", ws] as const,
  detail: (ws: string, id: string) => ["cadences", ws, id] as const,
  steps: (ws: string, id: string) => ["cadences", ws, id, "steps"] as const,
};

export function cadencesQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: cadencesKeys.all(workspaceId),
    queryFn: () => listCadences(workspaceId),
    staleTime: 30_000,
  });
}

export function useCadences() {
  const ws = useCurrentWorkspaceId();
  return useQuery(cadencesQueryOptions(ws));
}

export function useCadenceDetail(id: string | undefined) {
  const ws = useCurrentWorkspaceId();
  return useQuery({
    queryKey: cadencesKeys.detail(ws, id ?? ""),
    queryFn: () => (id ? getCadenceWithSteps(ws, id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCadenceSteps(id: string | undefined) {
  const ws = useCurrentWorkspaceId();
  return useQuery({
    queryKey: cadencesKeys.steps(ws, id ?? ""),
    queryFn: () => (id ? listCadenceSteps(ws, id) : Promise.resolve([])),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateCadence() {
  const ws = useCurrentWorkspaceId();
  const uid = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CadenceInput) => createCadence(ws, uid, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cadencesKeys.all(ws) }),
  });
}

export function useUpdateCadence() {
  const ws = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CadenceInput }) =>
      updateCadence(ws, id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: cadencesKeys.all(ws) });
      qc.invalidateQueries({ queryKey: cadencesKeys.detail(ws, id) });
    },
  });
}

export function useDeleteCadence() {
  const ws = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCadence(ws, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cadencesKeys.all(ws) }),
  });
}
