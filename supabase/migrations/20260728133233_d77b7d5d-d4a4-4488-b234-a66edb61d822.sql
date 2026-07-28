-- Enums
CREATE TYPE public.inbox_origem AS ENUM ('voz', 'texto', 'colado');
CREATE TYPE public.inbox_tipo AS ENUM ('ideia', 'tarefa', 'projeto', 'lembrete', 'nota');
CREATE TYPE public.inbox_status AS ENUM ('capturado', 'processando', 'sugerido', 'aprovado', 'descartado', 'erro');
ALTER TYPE public.task_origem ADD VALUE IF NOT EXISTS 'inbox_ia';

-- Tabela principal
CREATE TABLE public.inbox_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  origem public.inbox_origem NOT NULL DEFAULT 'texto',
  origem_detalhe text,
  audio_path text,
  duracao_seg integer,
  conteudo_raw text NOT NULL DEFAULT '',
  conteudo_editado text,
  tipo_sugerido public.inbox_tipo,
  tipo_confirmado public.inbox_tipo,
  titulo text,
  descricao text,
  categoria public.task_categoria,
  prioridade public.task_prioridade,
  prazo_sugerido date,
  projeto_sugerido text,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  proximas_acoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_payload jsonb,
  confianca numeric,
  correcoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.inbox_status NOT NULL DEFAULT 'capturado',
  convertido_em_tipo text,
  convertido_em_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_ai TO authenticated;
GRANT ALL ON public.inbox_ai TO service_role;
ALTER TABLE public.inbox_ai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_ai_select" ON public.inbox_ai FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "inbox_ai_insert" ON public.inbox_ai FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND criado_por = auth.uid());
CREATE POLICY "inbox_ai_update" ON public.inbox_ai FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND (criado_por = auth.uid() OR public.has_role(workspace_id, 'administrador')))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "inbox_ai_delete" ON public.inbox_ai FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND (criado_por = auth.uid() OR public.has_role(workspace_id, 'administrador')));

CREATE INDEX idx_inbox_ai_ws_status ON public.inbox_ai (workspace_id, status, created_at DESC);
CREATE INDEX idx_inbox_ai_ws_user ON public.inbox_ai (workspace_id, criado_por, created_at DESC);

CREATE TRIGGER trg_inbox_ai_updated_at BEFORE UPDATE ON public.inbox_ai
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Logs de processamento de IA
CREATE TABLE public.ai_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  inbox_id uuid REFERENCES public.inbox_ai(id) ON DELETE SET NULL,
  etapa text NOT NULL,
  modelo text,
  tokens_input integer,
  tokens_output integer,
  audio_seg integer,
  latencia_ms integer,
  custo_estimado numeric,
  status text NOT NULL DEFAULT 'ok',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_processing_logs TO authenticated;
GRANT ALL ON public.ai_processing_logs TO service_role;
ALTER TABLE public.ai_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_logs_select" ON public.ai_processing_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "ai_logs_insert" ON public.ai_processing_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX idx_ai_logs_ws_user_date ON public.ai_processing_logs (workspace_id, user_id, created_at DESC);

-- Resumo IA diário
CREATE TABLE public.ai_daily_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  resumo text NOT NULL DEFAULT '',
  destaques jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, data)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_daily_digests TO authenticated;
GRANT ALL ON public.ai_daily_digests TO service_role;
ALTER TABLE public.ai_daily_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_digests_select" ON public.ai_daily_digests FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "ai_digests_insert" ON public.ai_daily_digests FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());
CREATE POLICY "ai_digests_update" ON public.ai_daily_digests FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id) AND user_id = auth.uid());
CREATE POLICY "ai_digests_delete" ON public.ai_daily_digests FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND user_id = auth.uid());

CREATE TRIGGER trg_ai_digests_updated_at BEFORE UPDATE ON public.ai_daily_digests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();