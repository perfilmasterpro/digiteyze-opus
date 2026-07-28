import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import {
  convertDraft,
  createCapture,
  deleteInboxItem,
  discardInboxItem,
  listInbox,
  updateInboxItem,
  type ConvertDraftInput,
} from "../services/inbox.service";
import type { InboxCaptureInput, InboxItem } from "../types/inbox.types";

export const inboxKeys = {
  all: (workspaceId: string) => ["inbox-ai", workspaceId] as const,
};

export function useInboxItems() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    queryKey: inboxKeys.all(workspaceId),
    queryFn: () => listInbox(workspaceId),
    staleTime: 15_000,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return () => {
    qc.invalidateQueries({ queryKey: inboxKeys.all(workspaceId) });
    qc.invalidateQueries({ queryKey: ["central-tasks", workspaceId] });
    qc.invalidateQueries({ queryKey: ["central-indicators", workspaceId] });
  };
}

export function useCreateCapture() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: InboxCaptureInput) => createCapture(workspaceId, userId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateInboxItem() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateInboxItem>[2];
    }) => updateInboxItem(workspaceId, id, patch),
    onSuccess: invalidate,
  });
}

export function useDiscardInboxItem() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => discardInboxItem(workspaceId, id),
    onSuccess: invalidate,
  });
}

export function useDeleteInboxItem() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteInboxItem(workspaceId, id),
    onSuccess: invalidate,
  });
}

export function useConvertDraft() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ item, input }: { item: InboxItem; input: ConvertDraftInput }) =>
      convertDraft(workspaceId, userId, item, input),
    onSuccess: invalidate,
  });
}
