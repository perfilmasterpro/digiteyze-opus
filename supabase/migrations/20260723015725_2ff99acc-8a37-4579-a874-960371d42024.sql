-- Restaurar GRANTs em todas as tabelas do schema public. A migração
-- anterior de "hardening" revogou grants indispensáveis para a Data API
-- (PostgREST), deixando as tabelas invisíveis para os roles anon/authenticated/service_role
-- mesmo com RLS correta. Sem esses grants, o Kanban de Prospecção e todas as
-- demais telas retornam vazio para o usuário logado.

DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.name);
  END LOOP;
END $$;

-- Sequences (para inserts com colunas serial/identity)
DO $$
DECLARE s record;
BEGIN
  FOR s IN
    SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'S' AND n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', s.name);
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', s.name);
  END LOOP;
END $$;

-- Reassegurar EXECUTE nas funções SECURITY DEFINER usadas em RLS. Elas são
-- seguras por serem SECURITY DEFINER com search_path fixo e escopo restrito.
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid)       TO authenticated;
