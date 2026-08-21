import { supabase } from "@/integrations/supabase/client";
import { WebhookLog, ZapZapPayload } from "../types/webhook.types";
import { normalizePhone } from "@/lib/utils";
import { LeadMatcherService } from "@/modules/prospeccao/services/lead-matcher.service";


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

      if (data) {
        // Fase 5: Identificação Segura do Lead via LeadMatcher
        await this.identifyLeadSecurely(data as WebhookLog);
      }

      return { data, error };
    } catch (err) {
      console.error('Error logging webhook:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Identifica e associa um Lead ao evento do webhook de forma segura usando o LeadMatcher.
   */
  private static async identifyLeadSecurely(event: WebhookLog) {
    if (event.lead_match_status === 'matched' && event.lead_id) {
      return; // Idempotência: Já identificado
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      
      // Determinar o telefone do interlocutor com base na direção
      // Regra 3B: INBOUND -> sender_phone, OUTBOUND -> receiver_phone
      const isInbound = event.event === 'messages.upsert' || event.event.includes('inbound'); 
      const phoneToMatch = isInbound ? event.sender_phone : event.receiver_phone;

      if (!phoneToMatch) {
        await supabaseAdmin
          .from('zapzap_webhook_events')
          .update({
            lead_match_status: 'unmatched'
          })
          .eq('id', event.id);
        return;
      }

      const matchResult = await LeadMatcherService.matchLead(event.workspace_id, phoneToMatch);

      // Mapear status 'not_found' do matcher para 'unmatched' da tabela se necessário
      const tableStatus = matchResult.status === 'not_found' ? 'unmatched' : matchResult.status;

      await supabaseAdmin
        .from('zapzap_webhook_events')
        .update({
          lead_id: matchResult.leadId,
          lead_match_status: tableStatus
        })
        .eq('id', event.id);

      // Prompt 3C: Criar interação se for matched
      if (matchResult.status === 'matched' && matchResult.leadId) {
        await this.createInteractionFromEvent({
          ...event,
          lead_id: matchResult.leadId,
          lead_match_status: tableStatus
        });
      }

    } catch (err) {
      console.error('[Webhook] Secure lead identification failed:', err);
    }
  }

  /**
   * Mapeia o evento do webhook para uma interação de lead e persiste no banco.
   * Regra 3C: matched + lead_id válido -> criar interação
   */
  private static async createInteractionFromEvent(event: WebhookLog) {
    if (!event.lead_id || event.lead_match_status !== 'matched') return;

    try {
      const { createLeadInteraction } = await import("@/modules/prospeccao/services/lead-interactions.service");
      
      const payload = event.payload as ZapZapPayload;
      const messageData = payload.data;
      
      // Determinar direção
      const isInbound = event.event === 'messages.upsert' || event.event.includes('inbound');
      const direction = isInbound ? 'incoming' : 'outgoing';

      // Extrair conteúdo (texto, legenda ou fallback)
      const content = messageData?.text || messageData?.caption || 
                     (messageData?.message?.conversation) ||
                     (messageData?.message?.extendedTextMessage?.text) ||
                     (messageData?.message?.imageMessage?.caption) ||
                     (messageData?.message?.videoMessage?.caption) || 
                     '';

      await createLeadInteraction(
        event.workspace_id,
        event.lead_id,
        {
          tipo: 'whatsapp',
          descricao: content,
          payload: {
            tipo: 'whatsapp',
            direcao: direction,
            message_id: event.message_id || messageData?.id,
            external_id: event.external_id,
            chat_id: event.chat_id,
            sender_phone: event.sender_phone,
            receiver_phone: event.receiver_phone,
            instance_id: event.instance_id,
            provider: event.provider,
            mensagem: content,
            timestamp_whatsapp: messageData?.messageTimestamp || messageData?.t?.toString(),
            message_type: messageData?.messageType || (messageData?.message ? Object.keys(messageData.message)[0] : 'text'),
            metadata: {
              raw_event: event.event,
              pushName: messageData?.pushName
            }
          }
        },
        true // useAdmin = true para processamento de webhook
      );

      console.log(`[Webhook] Interação criada para o lead ${event.lead_id} (Msg: ${event.message_id})`);
    } catch (err) {
      console.error('[Webhook] Failed to create lead interaction:', err);
    }
  }

  /**
   * @deprecated Usar identifyLeadSecurely
   */
  private static async identifyLead(
    workspaceId: string, 
    eventId: string, 
    rawPhone?: string
  ) {
    // Mantido apenas para compatibilidade de assinatura se necessário, mas não utilizado.
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
