import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "../services/calendar-events.service";
import type { CalendarEventInput } from "../types/central.types";

export const calendarEventsKeys = {
  all: (workspaceId: string) => ["calendar-events", workspaceId] as const,
  range: (workspaceId: string, from?: string, to?: string) =>
    ["calendar-events", workspaceId, { from, to }] as const,
};

export function useCalendarEvents(range?: { from?: string; to?: string }) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: calendarEventsKeys.range(workspaceId, range?.from, range?.to),
    queryFn: () => listCalendarEvents(workspaceId, range),
    staleTime: 15_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, workspaceId: string) {
  qc.invalidateQueries({ queryKey: ["calendar-events", workspaceId] });
  qc.invalidateQueries({ queryKey: ["central-summary", workspaceId] });
  qc.invalidateQueries({ queryKey: ["ai-suggestions", workspaceId] });
}

export function useCreateCalendarEvent() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CalendarEventInput) =>
      createCalendarEvent(workspaceId, userId, input),
    onSuccess: () => invalidate(qc, workspaceId),
  });
}

export function useUpdateCalendarEvent() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CalendarEventInput> }) =>
      updateCalendarEvent(workspaceId, id, patch),
    onSuccess: () => invalidate(qc, workspaceId),
  });
}

export function useDeleteCalendarEvent() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(workspaceId, id),
    onSuccess: () => invalidate(qc, workspaceId),
  });
}
