GRANT ALL ON public.lead_events TO authenticated, service_role;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
-- As políticas já existem, mas vamos garantir que o RLS está ativo e as permissões concedidas.