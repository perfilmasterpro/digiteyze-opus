import { queryOptions, useQuery } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import { listEmpresaEvents } from "./services/empresa-events.service";

export const empresaEventsKeys = {
  all: (workspaceId: string, empresaId: string) =>
    ["empresa-events", workspaceId, empresaId] as const,
};

export function empresaEventsQueryOptions(workspaceId: string, empresaId: string) {
  return queryOptions({
    queryKey: empresaEventsKeys.all(workspaceId, empresaId),
    queryFn: () => listEmpresaEvents(workspaceId, empresaId),
    staleTime: 30_000,
  });
}

export function useEmpresaEvents(empresaId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...empresaEventsQueryOptions(workspaceId, empresaId),
    enabled: Boolean(empresaId),
  });
}
