-- Sprint 6.1 — Minha Central: tasks core + auxiliaries + calendar events

-- ============== ENUMS ==============
CREATE TYPE public.task_status AS ENUM (
  'pendente','em_andamento','aguardando','homologacao','concluida','cancelada'
);
CREATE TYPE public.task_prioridade AS ENUM ('baixa','media','alta','urgente');
CREATE TYPE public.task_categoria AS ENUM (
  'comercial','desenvolvimento','marketing','financeiro',
  'suporte','administrativo','conteudo','videoaula','projeto'
);
CREATE TYPE public.task_origem AS ENUM (
  'manual','lead','crm','projeto','ia','sistema'
);
CREATE TYPE public.calendar_event_tipo AS ENUM (
  'reuniao','pessoal','externo','outro'
);

-- ============== TASKS ==============
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  categoria public.task_categoria NOT NULL DEFAULT 'administrativo',
  status public.task_status NOT NULL DEFAULT 'pendente',
  prioridade public.task_prioridade NOT NULL DEFAULT 'media',
  origem public.task_origem NOT NULL DEFAULT 'manual',
  origem_ref_tipo text,
  origem_ref_id uuid,
  modulo_relacionado text,
  projeto text,
  data date,
  hora_inicio time,
  hora_fim time,
  prazo date,
  observacoes text,
  recurrence_rule jsonb,
  recurrence_parent_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  ordem int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_ws_data ON public.tasks(workspace_id, data);
CREATE INDEX idx_tasks_ws_status ON public.tasks(workspace_id, status);
CREATE INDEX idx_tasks_ws_resp ON public.tasks(workspace_id, responsavel_id);
CREATE INDEX idx_tasks_recurrence_parent ON public.tasks(recurrence_parent_id);
CREATE INDEX idx_tasks_origem_ref ON public.tasks(origem_ref_tipo, origem_ref_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_workspace" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "tasks_insert_workspace" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "tasks_update_workspace" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "tasks_delete_workspace" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== TASK CHECKLIST ==============
CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_checklist_task ON public.task_checklist_items(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklist_items TO authenticated;
GRANT ALL ON public.task_checklist_items TO service_role;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_all_workspace" ON public.task_checklist_items
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TRIGGER trg_task_checklist_updated_at
  BEFORE UPDATE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== TASK ATTACHMENTS ==============
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo_mime text,
  tamanho_bytes bigint,
  storage_path text NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_all_workspace" ON public.task_attachments
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ============== TASK COMMENTS ==============
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_nome text,
  corpo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_workspace" ON public.task_comments
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "comments_insert_workspace" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id) AND auth.uid() = autor_id);
CREATE POLICY "comments_update_own" ON public.task_comments
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND auth.uid() = autor_id)
  WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "comments_delete_own" ON public.task_comments
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id) AND auth.uid() = autor_id);

CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============== TASK DEPENDENCIES ==============
CREATE TABLE public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);
CREATE INDEX idx_task_deps_task ON public.task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends ON public.task_dependencies(depends_on_task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_dependencies TO authenticated;
GRANT ALL ON public.task_dependencies TO service_role;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deps_all_workspace" ON public.task_dependencies
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ============== CALENDAR EVENTS (independent from tasks) ==============
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  tipo public.calendar_event_tipo NOT NULL DEFAULT 'outro',
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  local text,
  participantes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_events_ws_data ON public.calendar_events(workspace_id, data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calevents_all_workspace" ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();