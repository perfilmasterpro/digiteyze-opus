
-- 1) Converter categoria enum -> text (permite categorias dinâmicas)
ALTER TABLE public.message_templates
  ALTER COLUMN categoria DROP DEFAULT;
ALTER TABLE public.message_templates
  ALTER COLUMN categoria TYPE text USING categoria::text;
ALTER TABLE public.message_templates
  ALTER COLUMN categoria SET DEFAULT 'outro';
DROP TYPE IF EXISTS public.message_template_categoria;

-- 2) Tabela de categorias compartilhadas por workspace
CREATE TABLE public.message_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#64748b',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_categories TO authenticated;
GRANT ALL ON public.message_categories TO service_role;

ALTER TABLE public.message_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros do workspace podem ver categorias"
  ON public.message_categories FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins e gestores podem criar categorias"
  ON public.message_categories FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (public.has_role(workspace_id, 'administrador'::app_role)
      OR public.has_role(workspace_id, 'gestor'::app_role))
  );

CREATE POLICY "Admins e gestores podem atualizar categorias"
  ON public.message_categories FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND (public.has_role(workspace_id, 'administrador'::app_role)
      OR public.has_role(workspace_id, 'gestor'::app_role))
  )
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (public.has_role(workspace_id, 'administrador'::app_role)
      OR public.has_role(workspace_id, 'gestor'::app_role))
  );

CREATE POLICY "Admins podem remover categorias"
  ON public.message_categories FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
    AND public.has_role(workspace_id, 'administrador'::app_role)
  );

CREATE TRIGGER trg_message_categories_updated_at
  BEFORE UPDATE ON public.message_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_message_categories_workspace_ordem
  ON public.message_categories (workspace_id, ordem);

-- 3) Seed nas workspaces existentes com as 8 categorias iniciais
INSERT INTO public.message_categories (workspace_id, slug, nome, cor, ordem)
SELECT w.id, s.slug, s.nome, s.cor, s.ordem
FROM public.workspaces w
CROSS JOIN (VALUES
  ('prospeccao',    'Prospecção',     '#3b82f6', 1),
  ('qualificacao',  'Qualificação',   '#22c55e', 2),
  ('demonstracao',  'Demonstração',   '#8b5cf6', 3),
  ('teste_gratuito','Teste Gratuito', '#15803d', 4),
  ('proposta',      'Proposta/Preço', '#f97316', 5),
  ('follow_up',     'Follow-up',      '#eab308', 6),
  ('reengajamento', 'Reengajamento',  '#c084fc', 7),
  ('perdido',       'Perdido',        '#ef4444', 8)
) AS s(slug, nome, cor, ordem)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- 4) Garantir que categorias legadas ainda presentes em templates existam como linhas
INSERT INTO public.message_categories (workspace_id, slug, nome, cor, ordem)
SELECT DISTINCT t.workspace_id, t.categoria,
  initcap(replace(t.categoria, '_', ' ')),
  '#64748b',
  99
FROM public.message_templates t
WHERE t.categoria IS NOT NULL
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- 5) Atualizar handle_new_user para semear categorias em novos workspaces
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ws_id uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1))
  );

  insert into public.workspaces (name)
  values (coalesce(new.raw_user_meta_data->>'workspace_name', 'Meu Workspace'))
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id) values (ws_id, new.id);
  insert into public.user_roles (user_id, workspace_id, role) values (new.id, ws_id, 'administrador');

  insert into public.message_categories (workspace_id, slug, nome, cor, ordem)
  values
    (ws_id, 'prospeccao',    'Prospecção',     '#3b82f6', 1),
    (ws_id, 'qualificacao',  'Qualificação',   '#22c55e', 2),
    (ws_id, 'demonstracao',  'Demonstração',   '#8b5cf6', 3),
    (ws_id, 'teste_gratuito','Teste Gratuito', '#15803d', 4),
    (ws_id, 'proposta',      'Proposta/Preço', '#f97316', 5),
    (ws_id, 'follow_up',     'Follow-up',      '#eab308', 6),
    (ws_id, 'reengajamento', 'Reengajamento',  '#c084fc', 7),
    (ws_id, 'perdido',       'Perdido',        '#ef4444', 8);

  return new;
end;
$function$;
