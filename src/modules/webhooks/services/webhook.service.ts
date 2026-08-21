import { supabase } from "@/integrations/supabase/client";
import { WebhookLog, ZapZapPayload } from "../types/webhook.types";

export class WebhookService {
  /**
   * Registra um novo webhook no banco de dados.
   * EXCLUSIVAMENTE para a Fase 3: Recebimento e Persistência Segura.
   */
  static async logWebhook(
    workspaceId: string,
    provider: string,
    payload: ZapZapPayload
  ): Promise<{ data: any; error: any }> {
    try {
      // Carregar cliente admin para bypass RLS no servidor
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Validar Workspace
      const { data: workspace, error: wsError } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .maybeSingle();

      if (wsError || !workspace) {
        return { data: null, error: new Error('Workspace inválido ou não encontrado') };
      }

      // Extração de dados da Fase 3
      const event = payload.event;
      const instanceId = payload.instance_id;
      const externalId = payload.data?.id; 
      const messageId = payload.data?.messageId || externalId;
      const senderPhone = payload.data?.from;
      const receiverPhone = payload.data?.to;
      const chatId = payload.data?.chatId;

      // Persistência Idempotente via Postgres Unique Constraint
      const { data, error } = await supabaseAdmin
        .from('zapzap_webhook_events')
        .insert({
          workspace_id: workspaceId,
          provider,
          external_id: externalId,
          event,
          instance_id: instanceId,
          sender_phone: senderPhone,
          receiver_phone: receiverPhone,
          chat_id: chatId,
          message_id: messageId,
          payload: payload as any,
          status: 'pending'
        })
        .select()
        .single();

      // Se for erro de duplicidade (23505), retornamos sucesso (idempotência)
      if (error && (error as any).code === '23505') {
        console.log(`[Webhook] Evento duplicado ignorado: ${externalId}`);
        return { data: { status: 'duplicate' }, error: null };
      }

      return { data, error };
    } catch (err) {
      console.error('Error logging webhook:', err);
      return { data: null, error: err };
    }
  }

  static async listLogs(workspaceId: string) {
    const { data, error } = await supabase
      .from('zapzap_webhook_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    
    return { data: data as WebhookLog[] | null, error };
  }
}
