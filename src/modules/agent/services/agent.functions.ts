/**
 * Server functions do módulo "Meu Agente".
 * Todas autenticadas — RLS aplicada como o próprio usuário.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AgentContext,
  AgentConversation,
  AgentMemory,
  AgentMessage,
} from "../types/agent.types";

async function resolveWorkspaceId(
  supabase: { from: (t: "workspace_members") => any },
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data?.workspace_id) throw new Error("Workspace não encontrado para o usuário.");
  return data.workspace_id as string;
}

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentConversation[]> => {
    const { data, error } = await context.supabase
      .from("agent_conversations")
      .select("*")
      .eq("user_id", context.userId)
      .eq("arquivada", false)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []) as AgentConversation[];
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentConversation> => {
    const workspaceId = await resolveWorkspaceId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("agent_conversations")
      .insert({ workspace_id: workspaceId, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as AgentConversation;
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_conversations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => input)
  .handler(async ({ data, context }): Promise<AgentMessage[]> => {
    const { data: rows, error } = await context.supabase
      .from("agent_messages")
      .select("id, conversation_id, role, content, tool_calls, created_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      role: row.role as AgentMessage["role"],
      content: row.content,
      tool_calls: Array.isArray(row.tool_calls)
        ? (row.tool_calls as unknown as AgentMessage["tool_calls"])
        : [],
      created_at: row.created_at,
    }));
  });

export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentMemory[]> => {
    const { data, error } = await context.supabase
      .from("agent_memories")
      .select(
        "id, categoria, titulo, conteudo, importancia, projeto, empresa_id, task_id, arquivada, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .eq("arquivada", false)
      .order("importancia", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as AgentMemory[];
  });

export const archiveMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_memories")
      .update({ arquivada: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAgentContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentContext> => {
    const workspaceId = await resolveWorkspaceId(context.supabase, context.userId);
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: tarefas } = await context.supabase
      .from("tasks")
      .select("id, titulo, status, prioridade, projeto, data, prazo")
      .eq("workspace_id", workspaceId);

    const abertas = (tarefas ?? []).filter(
      (t) => t.status !== "concluida" && t.status !== "cancelada",
    );

    const mapa = new Map<
      string,
      { abertas: number; concluidas: number; atrasadas: number }
    >();
    for (const t of tarefas ?? []) {
      const nome = t.projeto?.trim() || "Sem projeto";
      const acc = mapa.get(nome) ?? { abertas: 0, concluidas: 0, atrasadas: 0 };
      if (t.status === "concluida" || t.status === "cancelada") acc.concluidas += 1;
      else {
        acc.abertas += 1;
        if (t.prazo && t.prazo < hoje) acc.atrasadas += 1;
      }
      mapa.set(nome, acc);
    }

    const ordemPrioridade: Record<string, number> = {
      urgente: 0,
      alta: 1,
      media: 2,
      baixa: 3,
    };

    const { count: empresasAtivas } = await context.supabase
      .from("empresas")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    return {
      projetos: [...mapa.entries()]
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.abertas - a.abertas)
        .slice(0, 8),
      hoje: abertas.filter((t) => t.data === hoje).length,
      atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).length,
      pendentes: abertas.length,
      prioridadeTopo: abertas
        .sort(
          (a, b) =>
            (ordemPrioridade[a.prioridade] ?? 9) - (ordemPrioridade[b.prioridade] ?? 9),
        )
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          titulo: t.titulo,
          prioridade: t.prioridade,
          prazo: t.prazo,
        })),
      empresasAtivas: empresasAtivas ?? 0,
    };
  });
