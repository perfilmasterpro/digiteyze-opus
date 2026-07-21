import { useQuery } from "@tanstack/react-query";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import {
  computeIndicators,
  listFollowUps,
  type CentralIndicators,
  type FollowUpItem,
} from "../services/central-aggregator";
import { generateSuggestions, type Suggestion } from "../services/ai-suggestions";
import { listCalendarEvents } from "../services/calendar-events.service";
import { listTasks } from "../services/tasks.service";

export function useIndicators() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery<CentralIndicators>({
    queryKey: ["central-indicators", workspaceId],
    queryFn: () => computeIndicators(workspaceId),
    staleTime: 20_000,
  });
}

export function useFollowUps() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery<FollowUpItem[]>({
    queryKey: ["central-followups", workspaceId],
    queryFn: () => listFollowUps(workspaceId),
    staleTime: 20_000,
  });
}

export function useAiSuggestions() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery<Suggestion[]>({
    queryKey: ["ai-suggestions", workspaceId],
    queryFn: async () => {
      const [tasks, events, followUps] = await Promise.all([
        listTasks(workspaceId),
        listCalendarEvents(workspaceId),
        listFollowUps(workspaceId),
      ]);
      return generateSuggestions({ tasks, events, followUps });
    },
    staleTime: 30_000,
  });
}
