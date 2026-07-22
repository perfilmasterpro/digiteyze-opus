import { supabase } from "@/integrations/supabase/client";

import type {
  MessageCategory,
  MessageCategoryInput,
} from "../types/message-categories.types";

export async function listCategories(workspaceId: string): Promise<MessageCategory[]> {
  const { data, error } = await supabase
    .from("message_categories")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageCategory[];
}

export async function createCategory(
  workspaceId: string,
  input: MessageCategoryInput,
): Promise<MessageCategory> {
  const { data, error } = await supabase
    .from("message_categories")
    .insert({
      workspace_id: workspaceId,
      slug: input.slug,
      nome: input.nome,
      cor: input.cor,
      ativo: input.ativo ?? true,
      ordem: input.ordem ?? 99,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MessageCategory;
}

export async function updateCategory(
  workspaceId: string,
  id: string,
  patch: Partial<Omit<MessageCategoryInput, "slug">>,
): Promise<MessageCategory> {
  const { data, error } = await supabase
    .from("message_categories")
    .update({
      ...(patch.nome !== undefined ? { nome: patch.nome } : {}),
      ...(patch.cor !== undefined ? { cor: patch.cor } : {}),
      ...(patch.ativo !== undefined ? { ativo: patch.ativo } : {}),
      ...(patch.ordem !== undefined ? { ordem: patch.ordem } : {}),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MessageCategory;
}

export async function deleteCategory(workspaceId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("message_categories")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

export async function reorderCategories(
  workspaceId: string,
  orderedIds: string[],
): Promise<void> {
  // Update em lote — chamadas paralelas simples são suficientes para o volume
  // esperado (poucas dezenas de categorias por workspace).
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("message_categories")
        .update({ ordem: index + 1 })
        .eq("workspace_id", workspaceId)
        .eq("id", id),
    ),
  );
}
