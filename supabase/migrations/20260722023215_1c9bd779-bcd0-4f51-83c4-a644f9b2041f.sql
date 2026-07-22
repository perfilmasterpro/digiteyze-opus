
-- Cadências Comerciais
CREATE TABLE public.cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','inativa')),
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadences TO authenticated;
GRANT ALL ON public.cadences TO service_role;
ALTER TABLE public.cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cadences_select" ON public.cadences FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "cadences_insert" ON public.cadences FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "cadences_update" ON public.cadences FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "cadences_delete" ON public.cadences FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE TRIGGER cadences_set_updated_at BEFORE UPDATE ON public.cadences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX cadences_workspace_idx ON public.cadences(workspace_id);

-- Etapas
CREATE TABLE public.cadence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cadence_id UUID NOT NULL REFERENCES public.cadences(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 1,
  nome TEXT NOT NULL,
  categoria_id UUID REFERENCES public.message_categories(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  tipo_acao TEXT NOT NULL DEFAULT 'mensagem' CHECK (tipo_acao IN ('mensagem','tarefa','espera')),
  tempo_espera_dias INT NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadence_steps TO authenticated;
GRANT ALL ON public.cadence_steps TO service_role;
ALTER TABLE public.cadence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cadence_steps_select" ON public.cadence_steps FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "cadence_steps_insert" ON public.cadence_steps FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "cadence_steps_update" ON public.cadence_steps FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "cadence_steps_delete" ON public.cadence_steps FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE TRIGGER cadence_steps_set_updated_at BEFORE UPDATE ON public.cadence_steps
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX cadence_steps_cadence_idx ON public.cadence_steps(cadence_id, ordem);

-- Vínculo cadência x lead
CREATE TABLE public.lead_cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  cadence_id UUID NOT NULL REFERENCES public.cadences(id) ON DELETE CASCADE,
  etapa_atual INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','pausada')),
  proxima_acao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_proxima_acao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_cadences TO authenticated;
GRANT ALL ON public.lead_cadences TO service_role;
ALTER TABLE public.lead_cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_cadences_select" ON public.lead_cadences FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "lead_cadences_insert" ON public.lead_cadences FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "lead_cadences_update" ON public.lead_cadences FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "lead_cadences_delete" ON public.lead_cadences FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));
CREATE TRIGGER lead_cadences_set_updated_at BEFORE UPDATE ON public.lead_cadences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX lead_cadences_lead_idx ON public.lead_cadences(lead_id);
CREATE INDEX lead_cadences_cadence_idx ON public.lead_cadences(cadence_id);
