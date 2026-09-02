-- ─────────── agent_conversations ───────────
CREATE TABLE public.agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Nova conversa',
  arquivada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversations TO authenticated;
GRANT ALL ON public.agent_conversations TO service_role;

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_conversations_select_own" ON public.agent_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_conversations_insert_own" ON public.agent_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_conversations_update_own" ON public.agent_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_conversations_delete_own" ON public.agent_conversations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE INDEX idx_agent_conversations_user ON public.agent_conversations (workspace_id, user_id, updated_at DESC);

CREATE TRIGGER trg_agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─────────── agent_messages ───────────
CREATE TABLE public.agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content text NOT NULL DEFAULT '',
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_messages_select_own" ON public.agent_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_messages_insert_own" ON public.agent_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_messages_update_own" ON public.agent_messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_messages_delete_own" ON public.agent_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE INDEX idx_agent_messages_conversation ON public.agent_messages (conversation_id, created_at);

-- ─────────── agent_memories ───────────
CREATE TABLE public.agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'contexto'
    CHECK (categoria IN ('decisao', 'preferencia', 'contexto', 'proximo_passo', 'resumo', 'fato')),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  importancia integer NOT NULL DEFAULT 3 CHECK (importancia BETWEEN 1 AND 5),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  projeto text,
  origem_conversation_id uuid REFERENCES public.agent_conversations(id) ON DELETE SET NULL,
  arquivada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_memories TO authenticated;
GRANT ALL ON public.agent_memories TO service_role;

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_memories_select_own" ON public.agent_memories
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_memories_insert_own" ON public.agent_memories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_memories_update_own" ON public.agent_memories
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));
CREATE POLICY "agent_memories_delete_own" ON public.agent_memories
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

CREATE INDEX idx_agent_memories_user ON public.agent_memories (workspace_id, user_id, arquivada, importancia DESC);

CREATE TRIGGER trg_agent_memories_updated_at
  BEFORE UPDATE ON public.agent_memories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();