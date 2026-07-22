
-- 1) Revogar privilégios amplos herdados nas tabelas sensíveis
REVOKE ALL ON public.user_roles FROM anon, authenticated;
REVOKE ALL ON public.workspace_members FROM anon, authenticated;
REVOKE ALL ON public.super_admins FROM anon, authenticated;
REVOKE ALL ON public.workspaces FROM anon, authenticated;

-- 2) Reconceder somente o mínimo necessário para as policies existentes funcionarem
--    (RLS default-deny cobre INSERT/UPDATE/DELETE — não há policies para essas ações)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT SELECT ON public.super_admins TO authenticated;
GRANT SELECT, UPDATE ON public.workspaces TO authenticated;

-- 3) Garantir que service_role mantém acesso total (para triggers/backend confiável)
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.workspace_members TO service_role;
GRANT ALL ON public.super_admins TO service_role;
GRANT ALL ON public.workspaces TO service_role;

-- 4) Funções SECURITY DEFINER: revogar EXECUTE de anônimos
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- 5) Garantir EXECUTE apenas para authenticated (necessário porque as policies usam essas funções)
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
