import { supabase } from "@/integrations/supabase/client";
import { WebhookLog, ZapZapPayload } from "../types/webhook.types";

export class WebhookService {
  /**
   * Registra um novo webhook no banco de dados.
   * Usa o cliente administrativo (ou anon com grants) para persistir o log.
   * Implementa proteção básica contra duplicidade via external_id.
   */
  static async logWebhook(
    workspaceId: string,
    provider: string,
    payload: ZapZapPayload
  ): Promise<{ data: any; error: any }> {
    try {
      // Extração de dados comuns baseada na estrutura do ZapZap
      const eventType = payload.event;
      const instanceId = payload.instance_id;
      const externalId = payload.data?.id; // ID único da mensagem/evento
      const contactPhone = payload.data?.from || payload.data?.to;
      const contactName = payload.data?.pushName;
      const messageText = payload.data?.body;

      // Verificação de duplicidade (se externalId existir)
      if (externalId) {
        const { data: existing } = await supabase
          .from('webhook_logs')
          .select('id')
          .eq('external_id', externalId)
          .eq('provider', provider)
          .maybeSingle();

        if (existing) {
          return { data: existing, error: null }; // Já registrado
        }
      }

      const { data, error } = await supabase
        .from('webhook_logs')
        .insert({
          workspace_id: workspaceId,
          provider,
          external_id: externalId,
          instance_id: instanceId,
          event_type: eventType,
          contact_phone: contactPhone,
          contact_name: contactName,
          message_text: messageText,
          payload: payload,
          status: 'pending'
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      console.error('Error logging webhook:', err);
      return { data: null, error: err };
    }
  }

  static async listLogs(workspaceId: string) {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    
    return { data: data as WebhookLog[] | null, error };
  }
}
