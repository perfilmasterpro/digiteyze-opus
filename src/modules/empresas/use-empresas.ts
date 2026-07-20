import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import {
  archiveEmpresa,
  createEmpresa,
  getEmpresa,
  listEmpresas,
  reactivateEmpresa,
  updateEmpresa,
} from "./empresas.service";
import type { EmpresaInput } from "./empresas.types";

/**
 * Query keys escopadas por workspace — padrão multi-tenant.
 * Formato: ["empresas", workspaceId] e ["empresa", workspaceId, id].
 */
export const empresasKeys = {
  all: (workspaceId: string) => ["empresas", workspaceId] as const,
  detail: (workspaceId: string, id: string) => ["empresa", workspaceId, id] as const,
};

export function empresasQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: empresasKeys.all(workspaceId),
    queryFn: listEmpresas,
  });
}

export function empresaQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: empresasKeys.detail(workspaceId, id),
    queryFn: () => getEmpresa(id),
  });
}

export function useEmpresas() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(empresasQueryOptions(workspaceId));
}

export function useEmpresa(id: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...empresaQueryOptions(workspaceId, id),
    enabled: Boolean(id),
  });
}

function useInvalidateEmpresas() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: empresasKeys.all(workspaceId) });
    if (id) qc.invalidateQueries({ queryKey: empresasKeys.detail(workspaceId, id) });
  };
}

export function useCreateEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: (input: EmpresaInput) => createEmpresa(input),
    onSuccess: (created) => invalidate(created.id),
  });
}

export function useUpdateEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmpresaInput }) => updateEmpresa(id, input),
    onSuccess: (updated) => invalidate(updated.id),
  });
}

export function useArchiveEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: (id: string) => archiveEmpresa(id),
    onSuccess: (updated) => invalidate(updated.id),
  });
}

export function useReactivateEmpresa() {
  const invalidate = useInvalidateEmpresas();
  return useMutation({
    mutationFn: (id: string) => reactivateEmpresa(id),
    onSuccess: (updated) => invalidate(updated.id),
  });
}
