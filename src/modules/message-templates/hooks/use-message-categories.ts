import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { useCurrentWorkspaceId } from "@/lib/workspace";

import {
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from "../services/message-categories.service";
import {
  DEFAULT_CATEGORY_COLOR,
  type MessageCategory,
  type MessageCategoryInput,
} from "../types/message-categories.types";

export const messageCategoriesKeys = {
  all: (workspaceId: string) => ["message-categories", workspaceId] as const,
};

export function messageCategoriesQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: messageCategoriesKeys.all(workspaceId),
    queryFn: () => listCategories(workspaceId),
    staleTime: 60_000,
  });
}

export function useMessageCategories() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(messageCategoriesQueryOptions(workspaceId));
}

/** Categorias ativas — usado nos seletores/pickers. */
export function useActiveMessageCategories() {
  const q = useMessageCategories();
  return useMemo(
    () => (q.data ?? []).filter((c) => c.ativo),
    [q.data],
  );
}

/** Mapa slug → categoria, útil para renderização de cores/labels em qualquer lugar. */
export function useMessageCategoryMap(): Map<string, MessageCategory> {
  const q = useMessageCategories();
  return useMemo(() => {
    const map = new Map<string, MessageCategory>();
    for (const c of q.data ?? []) map.set(c.slug, c);
    return map;
  }, [q.data]);
}

/** Recupera a cor de uma categoria por slug, com fallback neutro. */
export function useMessageCategoryColor(slug: string | undefined | null): string {
  const map = useMessageCategoryMap();
  if (!slug) return DEFAULT_CATEGORY_COLOR;
  return map.get(slug)?.cor ?? DEFAULT_CATEGORY_COLOR;
}

export function useCreateCategory() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MessageCategoryInput) => createCategory(workspaceId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: messageCategoriesKeys.all(workspaceId) }),
  });
}

export function useUpdateCategory() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<MessageCategoryInput, "slug">>;
    }) => updateCategory(workspaceId, id, patch),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: messageCategoriesKeys.all(workspaceId) }),
  });
}

export function useDeleteCategory() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(workspaceId, id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: messageCategoriesKeys.all(workspaceId) }),
  });
}

export function useReorderCategories() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderCategories(workspaceId, orderedIds),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: messageCategoriesKeys.all(workspaceId) }),
  });
}
