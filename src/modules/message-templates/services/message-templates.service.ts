/**
 * Service do domínio "Biblioteca de Mensagens" (Supabase).
 *
 * RLS por workspace_id — a coluna é injetada explicitamente em toda mutação
 * para paridade com o filtro `.eq("workspace_id", …)` das leituras.
 */

import { supabase } from "@/integrations/supabase/client";

import { extractTokens } from "./apply-variables";
import type {
  MessageTemplate,
  MessageTemplateInput,
} from "../types/message-templates.types";

export async function listTemplates(workspaceId: string): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("categoria", { ascending: true })
    .order("titulo", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageTemplate[];
}

export async function getTemplate(
  workspaceId: string,
  id: string,
): Promise<MessageTemplate | null> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as MessageTemplate | null) ?? null;
}

export async function createTemplate(
  workspaceId: string,
  userId: string,
  input: MessageTemplateInput,
): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      workspace_id: workspaceId,
      titulo: input.titulo,
      categoria: input.categoria,
      corpo: input.corpo,
      variaveis: extractTokens(input.corpo),
      ativo: input.ativo ?? true,
      created_by: userId,
      updated_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MessageTemplate;
}

export async function updateTemplate(
  workspaceId: string,
  userId: string,
  id: string,
  input: MessageTemplateInput,
): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from("message_templates")
    .update({
      titulo: input.titulo,
      categoria: input.categoria,
      corpo: input.corpo,
      variaveis: extractTokens(input.corpo),
      ativo: input.ativo ?? true,
      updated_by: userId,
    })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MessageTemplate;
}

export async function setTemplateActive(
  workspaceId: string,
  userId: string,
  id: string,
  ativo: boolean,
): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from("message_templates")
    .update({ ativo, updated_by: userId })
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MessageTemplate;
}

export async function deleteTemplate(workspaceId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}

/* ─────────── Favoritos pessoais ─────────── */

export async function listMyFavoriteTemplateIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("message_template_favorites")
    .select("template_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.template_id as string);
}

export async function addFavorite(userId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from("message_template_favorites")
    .insert({ user_id: userId, template_id: templateId });
  if (error && error.code !== "23505") throw error; // ignora duplicidade
}

export async function removeFavorite(userId: string, templateId: string): Promise<void> {
  const { error } = await supabase
    .from("message_template_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("template_id", templateId);
  if (error) throw error;
}
