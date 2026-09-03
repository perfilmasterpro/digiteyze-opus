/** Hooks de dados do módulo "Meu Agente". */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveMemory,
  createConversation,
  deleteConversation,
  getAgentContext,
  listConversations,
  listMemories,
  listMessages,
} from "../services/agent.functions";

export const agentKeys = {
  conversations: ["agent", "conversations"] as const,
  messages: (id: string) => ["agent", "messages", id] as const,
  memories: ["agent", "memories"] as const,
  context: ["agent", "context"] as const,
};

export function useAgentConversations() {
  return useQuery({
    queryKey: agentKeys.conversations,
    queryFn: () => listConversations(),
  });
}

export function useAgentMessages(conversationId: string | null) {
  return useQuery({
    queryKey: agentKeys.messages(conversationId ?? "none"),
    queryFn: () => listMessages({ data: { conversationId: conversationId as string } }),
    enabled: Boolean(conversationId),
  });
}

export function useAgentMemories() {
  return useQuery({ queryKey: agentKeys.memories, queryFn: () => listMemories() });
}

export function useAgentContext() {
  return useQuery({ queryKey: agentKeys.context, queryFn: () => getAgentContext() });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createConversation(),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.conversations }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConversation({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.conversations }),
  });
}

export function useArchiveMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveMemory({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.memories }),
  });
}
