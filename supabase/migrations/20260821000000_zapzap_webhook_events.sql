-- 1. Create the new table zapzap_webhook_events
CREATE TABLE IF NOT EXISTS public.zapzap_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'zapzap',
    external_id TEXT,
    event TEXT NOT NULL,
    instance_id TEXT,
    sender_phone TEXT,
    receiver_phone TEXT,
    chat_id TEXT,
    message_id TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 2. Idempotency Constraint
    CONSTRAINT zapzap_webhook_events_provider_external_id_workspace_id_key UNIQUE (provider, external_id, workspace_id)
);

-- 3. Migrate data from webhook_logs if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_logs') THEN
        INSERT INTO public.zapzap_webhook_events (
            id, workspace_id, provider, external_id, event, instance_id, 
            sender_phone, payload, status, error_message, processed_at, created_at
        )
        SELECT 
            id, workspace_id, provider, external_id, event_type, instance_id, 
            contact_phone, payload, status, error_message, processed_at, created_at
        FROM public.webhook_logs
        ON CONFLICT (provider, external_id, workspace_id) DO NOTHING;
    END IF;
END $$;

-- 4. Set up RLS and Grants
ALTER TABLE public.zapzap_webhook_events ENABLE ROW LEVEL SECURITY;

-- Grant access to service_role (for our backend server functions/webhooks)
GRANT ALL ON public.zapzap_webhook_events TO service_role;
GRANT SELECT ON public.zapzap_webhook_events TO authenticated;

-- Policies
CREATE POLICY "Super Admins can view all zapzap events"
ON public.zapzap_webhook_events
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own workspace zapzap events"
ON public.zapzap_webhook_events
FOR SELECT
TO authenticated
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- 5. Indexes for performance
CREATE INDEX idx_zapzap_webhook_events_workspace_id ON public.zapzap_webhook_events(workspace_id);
CREATE INDEX idx_zapzap_webhook_events_external_id ON public.zapzap_webhook_events(external_id);
CREATE INDEX idx_zapzap_webhook_events_created_at ON public.zapzap_webhook_events(created_at DESC);
