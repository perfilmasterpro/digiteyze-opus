-- =========================================================================
-- Sprint 6 — Biblioteca de Mensagens Comerciais
-- =========================================================================

-- Enum de categorias
CREATE TYPE public.message_template_categoria AS ENUM (
  'prospeccao',
  'follow_up',
  'apresentacao',
  'objecao',
  'reengajamento',
  'agradecimento',
  'outro'
);

-- -------------------------------------------------------------------------
-- Tabela: message_templates
-- -------------------------------------------------------------------------
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria public.message_template_categoria NOT NULL DEFAULT 'outro',
  corpo TEXT NOT NULL,
  variaveis TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_templates_workspace ON public.message_templates(workspace_id);
CREATE INDEX idx_message_templates_workspace_ativo ON public.message_templates(workspace_id, ativo);
CREATE INDEX idx_message_templates_categoria ON public.message_templates(workspace_id, categoria);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer membro do workspace
CREATE POLICY "Membros do workspace podem ver templates"
  ON public.message_templates
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Criação: admin, gestor ou comercial
CREATE POLICY "Admins, gestores e comercial podem criar templates"
  ON public.message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (
      public.has_role(workspace_id, 'administrador')
      OR public.has_role(workspace_id, 'gestor')
      OR public.has_role(workspace_id, 'comercial')
    )
  );

-- Atualização: admin, gestor ou comercial
CREATE POLICY "Admins, gestores e comercial podem atualizar templates"
  ON public.message_templates
  FOR UPDATE
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      public.has_role(workspace_id, 'administrador')
      OR public.has_role(workspace_id, 'gestor')
      OR public.has_role(workspace_id, 'comercial')
    )
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (
      public.has_role(workspace_id, 'administrador')
      OR public.has_role(workspace_id, 'gestor')
      OR public.has_role(workspace_id, 'comercial')
    )
  );

-- Deleção: apenas administrador
CREATE POLICY "Admins podem deletar templates"
  ON public.message_templates
  FOR DELETE
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.has_role(workspace_id, 'administrador')
  );

-- Trigger de updated_at (função já existe em public.tg_set_updated_at)
CREATE TRIGGER trg_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- -------------------------------------------------------------------------
-- Tabela: message_template_favorites
-- -------------------------------------------------------------------------
CREATE TABLE public.message_template_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.message_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, user_id)
);

CREATE INDEX idx_message_template_favorites_user ON public.message_template_favorites(user_id);
CREATE INDEX idx_message_template_favorites_template ON public.message_template_favorites(template_id);

GRANT SELECT, INSERT, DELETE ON public.message_template_favorites TO authenticated;
GRANT ALL ON public.message_template_favorites TO service_role;

ALTER TABLE public.message_template_favorites ENABLE ROW LEVEL SECURITY;

-- Cada usuário só enxerga e gerencia os próprios favoritos
CREATE POLICY "Usuário gerencia próprios favoritos"
  ON public.message_template_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
