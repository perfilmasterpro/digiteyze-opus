import { queryOptions, useQuery } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import { listLeadEvents } from "../services/lead-events.service";

export const leadEventsKeys = {
  all: (workspaceId: string, leadId: string) =>
    ["lead-events", workspaceId, leadId] as const,
};

export function leadEventsQueryOptions(workspaceId: string, leadId: string) {
  return queryOptions({
    queryKey: leadEventsKeys.all(workspaceId, leadId),
    queryFn: () => listLeadEvents(workspaceId, leadId),
    staleTime: 30_000,
  });
}

export function useLeadEvents(leadId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...leadEventsQueryOptions(workspaceId, leadId),
    enabled: Boolean(leadId),
  });
}
