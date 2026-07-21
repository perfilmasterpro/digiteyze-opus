import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import {
  addFavorite,
  createTemplate,
  deleteTemplate,
  listMyFavoriteTemplateIds,
  listTemplates,
  removeFavorite,
  setTemplateActive,
  updateTemplate,
} from "../services/message-templates.service";
import type { MessageTemplateInput } from "../types/message-templates.types";

export const messageTemplatesKeys = {
  all: (workspaceId: string) => ["message-templates", workspaceId] as const,
  favorites: (userId: string) => ["message-template-favorites", userId] as const,
};

export function messageTemplatesQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: messageTemplatesKeys.all(workspaceId),
    queryFn: () => listTemplates(workspaceId),
    staleTime: 60_000,
  });
}

export function useMessageTemplates() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(messageTemplatesQueryOptions(workspaceId));
}

export function useMyFavoriteTemplates() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: messageTemplatesKeys.favorites(userId),
    queryFn: () => listMyFavoriteTemplateIds(userId),
    staleTime: 60_000,
  });
}

export function useCreateTemplate() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MessageTemplateInput) => createTemplate(workspaceId, userId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageTemplatesKeys.all(workspaceId) });
    },
  });
}

export function useUpdateTemplate() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MessageTemplateInput }) =>
      updateTemplate(workspaceId, userId, id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageTemplatesKeys.all(workspaceId) });
    },
  });
}

export function useSetTemplateActive() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      setTemplateActive(workspaceId, userId, id, ativo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageTemplatesKeys.all(workspaceId) });
    },
  });
}

export function useDeleteTemplate() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(workspaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageTemplatesKeys.all(workspaceId) });
    },
  });
}

export function useToggleFavoriteTemplate() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, favorite }: { templateId: string; favorite: boolean }) => {
      if (favorite) await addFavorite(userId, templateId);
      else await removeFavorite(userId, templateId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageTemplatesKeys.favorites(userId) });
    },
  });
}
