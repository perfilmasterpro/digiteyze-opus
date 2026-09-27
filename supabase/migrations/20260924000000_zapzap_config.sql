-- ZapZap integration credentials, per workspace (multi-tenant).
-- Reconstruído a partir das auditorias 2026-09-24 (camada de config perdida:
-- só existia no build compilado do Vercel). Ver mapa-tecnico.md §5 e
-- auditoria-codigo-integracao.md (fallback fromEnv, masking, merge parcial).
--
-- SEGURANÇA: a tabela guarda segredos (api_secret, webhook_secret). Por isso
-- NÃO há GRANT para `authenticated`: o cliente nunca lê esta tabela direto.
-- Toda leitura passa pelo servidor via `supabaseAdmin` (service_role), que
-- devolve a config MASCARADA pela rota /api/integracoes/zapzap-config.

-- 1. Tabela (1 linha por workspace)
CREATE TABLE IF NOT EXISTS public.zapzap_config (
    workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    api_key text NOT NULL DEFAULT '',
    api_secret text NOT NULL DEFAULT '',
    instance_id text NOT NULL DEFAULT '',
    base_url text NOT NULL DEFAULT '',
    webhook_secret text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Trigger de updated_at (usa a mesma convenção das demais tabelas)
CREATE OR REPLACE FUNCTION public.set_zapzap_config_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_zapzap_config_updated_at ON public.zapzap_config;
CREATE TRIGGER trg_zapzap_config_updated_at
    BEFORE UPDATE ON public.zapzap_config
    FOR EACH ROW EXECUTE FUNCTION public.set_zapzap_config_updated_at();

-- 3. RLS: só service_role. Sem policy para `authenticated` porque a linha
-- contém segredos; o app lê/escreve exclusivamente pelo servidor (service_role,
-- que bypassa RLS). Habilitar RLS sem policy = nega qualquer acesso via anon key.
ALTER TABLE public.zapzap_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.zapzap_config TO service_role;
