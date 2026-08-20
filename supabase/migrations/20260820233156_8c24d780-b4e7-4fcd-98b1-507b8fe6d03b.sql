CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    external_id TEXT,
    provider TEXT NOT NULL DEFAULT 'zapzap',
    instance_id TEXT,
    event_type TEXT NOT NULL,
    contact_phone TEXT,
    contact_name TEXT,
    message_text TEXT,
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_external_id ON public.webhook_logs(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_webhook_logs_workspace_id ON public.webhook_logs(workspace_id);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;
GRANT INSERT ON public.webhook_logs TO anon; -- Allow anonymous inserts for the public webhook endpoint

CREATE POLICY "Users can view webhook logs of their workspace"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (workspace_id = (SELECT current_setting('app.current_workspace_id', true)::uuid));

-- Allow the public endpoint to insert via service role or anon if needed.
-- Since it's a server route, we can use supabaseAdmin which bypasses RLS,
-- but having the grant is safer for future-proofing.
