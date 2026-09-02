/**
 * Tipos do módulo "Meu Agente" (client-safe).
 *
 * Separação estrita:
 *  - Conversas/mensagens  → histórico bruto do chat (agent_conversations/agent_messages)
 *  - Memória              → apenas informações persistentes e relevantes (agent_memories)
 *  - Contexto             → derivado dos módulos existentes (tasks, empresas, eventos)
 */

export type AgentRole = "user" | "assistant" | "tool" | "system";

export interface AgentConversation {
  id: string;
  workspace_id: string;
  user_id: string;
  titulo: string;
  arquivada: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentToolCall {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  resumo?: string;
}

export interface AgentMessage {
  id: string;
  conversation_id: string;
  role: AgentRole;
  content: string;
  tool_calls: AgentToolCall[];
  created_at: string;
}

export const MEMORY_CATEGORIES = [
  "decisao",
  "preferencia",
  "contexto",
  "proximo_passo",
  "resumo",
  "fato",
] as const;
export type MemoryCategoria = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORIA_LABEL: Record<MemoryCategoria, string> = {
  decisao: "Decisão",
  preferencia: "Preferência",
  contexto: "Contexto",
  proximo_passo: "Próximo passo",
  resumo: "Resumo",
  fato: "Fato",
};

export interface AgentMemory {
  id: string;
  categoria: MemoryCategoria;
  titulo: string;
  conteudo: string;
  importancia: number;
  projeto: string | null;
  empresa_id: string | null;
  task_id: string | null;
  arquivada: boolean;
  created_at: string;
  updated_at: string;
}

/** Contexto derivado dos dados reais do Growth, exibido ao lado do chat. */
export interface AgentContext {
  projetos: { nome: string; abertas: number; concluidas: number; atrasadas: number }[];
  hoje: number;
  atrasadas: number;
  pendentes: number;
  prioridadeTopo: { id: string; titulo: string; prioridade: string; prazo: string | null }[];
  empresasAtivas: number;
}

export interface SendMessageResult {
  conversationId: string;
  reply: string;
  toolCalls: AgentToolCall[];
}
