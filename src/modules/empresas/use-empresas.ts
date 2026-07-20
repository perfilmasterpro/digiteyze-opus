import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveEmpresa,
  createEmpresa,
  listEmpresas,
  updateEmpresa,
} from "./empresas.service";
import type { EmpresaInput } from "./empresas.types";

export const empresasQueryOptions = queryOptions({
  queryKey: ["empresas"] as const,
  queryFn: listEmpresas,
});

export function useEmpresas() {
  return useQuery(empresasQueryOptions);
}

export function useCreateEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmpresaInput) => createEmpresa(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: empresasQueryOptions.queryKey }),
  });
}

export function useUpdateEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmpresaInput }) => updateEmpresa(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: empresasQueryOptions.queryKey }),
  });
}

export function useArchiveEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveEmpresa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: empresasQueryOptions.queryKey }),
  });
}
