
-- 1) Super admins
CREATE TABLE public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id)
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;

CREATE POLICY "super_admins can read super_admins"
  ON public.super_admins FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 2) Admin logs
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_logs_created_at_idx ON public.admin_logs (created_at DESC);
CREATE INDEX admin_logs_event_type_idx ON public.admin_logs (event_type);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admins read admin_logs"
  ON public.admin_logs FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 3) Workspace settings
CREATE TABLE public.workspace_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own workspace_settings"
  ON public.workspace_settings FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR public.is_super_admin());

CREATE TRIGGER trg_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4) Seed workspace_settings for existing workspaces
INSERT INTO public.workspace_settings (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;
