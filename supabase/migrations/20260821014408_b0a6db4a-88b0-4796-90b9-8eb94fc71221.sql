-- Criar tipo enum se não existir
DO $$ BEGIN
    CREATE TYPE public.lead_match_status AS ENUM ('matched', 'unmatched', 'ambiguous');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar colunas para associação de leads
ALTER TABLE public.zapzap_webhook_events 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id),
ADD COLUMN IF NOT EXISTS lead_match_status public.lead_match_status DEFAULT 'unmatched';

-- Garantir privilégios
GRANT SELECT, UPDATE ON public.zapzap_webhook_events TO authenticated;
GRANT ALL ON public.zapzap_webhook_events TO service_role;
