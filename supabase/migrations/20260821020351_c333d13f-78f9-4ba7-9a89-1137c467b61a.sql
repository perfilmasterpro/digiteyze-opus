CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_interactions_whatsapp_id 
ON public.lead_interactions (
  workspace_id, 
  (data->>'message_id')
) 
WHERE (data->>'tipo' = 'whatsapp' AND data->>'message_id' IS NOT NULL);

COMMENT ON INDEX public.idx_lead_interactions_whatsapp_id IS 'Ensures no duplicate WhatsApp messages are stored per workspace based on their external message_id.';
