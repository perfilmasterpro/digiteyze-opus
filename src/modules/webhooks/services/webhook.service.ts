import { supabase } from "@/integrations/supabase/client";
import { WebhookLog, ZapZapPayload, ZapZapExtracted } from "../types/webhook.types";
import { normalizePhone } from "@/lib/utils";
import { LeadMatcherService, LeadMatchResult } from "@/modules/prospeccao/services/lead-matcher.service";

/** Remove sufixos JID do WhatsApp (@s.whatsapp.net, @lid, @g.us) e caracteres não numéricos. */
function cleanJid(value?: string | null): string | null {
  if (!value) return null;
  const raw = String(value).split('@')[0];
  const digits = normalizePhone(raw);
  return digits || null;
}

function firstString(...values: Array<unknown>): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return null;
}

export class WebhookService {
  /**
   * Normaliza o payload do ZapZap para um formato canônico.
   * Suporta o formato real do evento `messages` (data.message / data.chat)
   * e o formato legado (campos diretamente em data).
   */
  static extractEvent(payload: ZapZapPayload): ZapZapExtracted {
    const data: any = payload.data ?? {};
    const message: any = data.message ?? {};
    const chat: any = data.chat ?? {};

    const hasNewFormat = !!data.message || !!data.chat;

    // --- IDs ---
    const messageId = firstString(
      message.messageid,
      message.id,
      data.messageId,
      data.id,
    );

    const chatId = firstString(
      message.chatid,
      chat.wa_chatid,
      chat.id,
      data.chatId,
    );

    const externalId = firstString(
      payload.event_id,
      message.id,
      message.messageid,
      data.id,
      payload.delivery_id,
    );

    // --- Direção ---
    let isInbound: boolean;
    if (typeof message.fromMe === 'boolean') {
      isInbound = message.fromMe === false;
    } else {
      isInbound = payload.event === 'messages.upsert' || payload.event.includes('inbound');
    }

    // --- Telefones ---
    const contactPhone = hasNewFormat
      ? cleanJid(
          firstString(message.sender_pn, chat.phone, message.chatid, chat.wa_chatid),
        )
      : cleanJid(isInbound ? data.from : data.to);

    const ownerPhone = hasNewFormat
      ? cleanJid(firstString(message.owner, chat.owner))
      : cleanJid(isInbound ? data.to : data.from);

    const senderPhone = isInbound ? contactPhone : ownerPhone;
    const receiverPhone = isInbound ? ownerPhone : contactPhone;

    // --- Conteúdo ---
    const content = firstString(
      message.content,
      message.text,
      data.text,
      data.body,
      data.caption,
      data.message?.conversation,
      data.message?.extendedTextMessage?.text,
      data.message?.imageMessage?.caption,
      data.message?.videoMessage?.caption,
    ) ?? '';

    const rawTs = message.messageTimestamp ?? data.messageTimestamp ?? data.timestamp ?? data.t;

    return {
      event: payload.event,
      instanceId: payload.instance_id ?? null,
      externalId,
      messageId,
      chatId,
      senderPhone,
      receiverPhone,
      contactPhone,
      contactName: firstString(chat.wa_contactName, message.senderName, chat.name, data.pushName),
      content,
      isInbound,
      messageType: firstString(message.messageType, message.type, data.messageType, data.type),
      timestamp: rawTs !== undefined && rawTs !== null ? String(rawTs) : null,
    };
  }

  /**
   * Registra um novo webhook no banco de dados.
   */
  static async logWebhook(
    workspaceId: string,
    provider: string,
    payload: ZapZapPayload
  ): Promise<{ data: any; error: any }> {
    try {
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

      const extracted = this.extractEvent(payload);

      // Persistência Idempotente via Postgres Unique Constraint
      const { data, error } = await supabaseAdmin
        .from('zapzap_webhook_events')
        .insert({
          workspace_id: workspaceId,
          provider,
          external_id: extracted.externalId,
          event: extracted.event,
          instance_id: extracted.instanceId,
          sender_phone: extracted.senderPhone,
          receiver_phone: extracted.receiverPhone,
          chat_id: extracted.chatId,
          message_id: extracted.messageId,
          payload: payload as any,
          status: 'pending'
        })
        .select()
        .single();

      // Se for erro de duplicidade (23505), retornamos sucesso (idempotência)
      if (error && (error as any).code === '23505') {
        console.log(`[Webhook] Evento duplicado ignorado: ${extracted.externalId}`);
        return { data: { status: 'duplicate' }, error: null };
      }

      if (data) {
        await this.identifyLeadSecurely(data as WebhookLog);
      }

      return { data, error };
    } catch (err) {
      console.error('Error logging webhook:', err);
      return { data: null, error: err };
    }
  }

  /**
   * Tenta casar o telefone com um Lead usando o LeadMatcher existente,
   * com variações de DDI (55) quando a primeira tentativa não encontra.
   */
  private static async matchWithDdiFallback(
    workspaceId: string,
    phone: string
  ): Promise<LeadMatchResult> {
    const base = normalizePhone(phone);
    const candidates = new Set<string>([base]);

    if (base.startsWith('55') && base.length >= 12) {
      candidates.add(base.slice(2));
    } else if (base.length >= 10 && base.length <= 11) {
      candidates.add(`55${base}`);
    }

    let last: LeadMatchResult = { status: 'not_found', leadId: null, phone: base };
    for (const candidate of candidates) {
      const result = await LeadMatcherService.matchLead(workspaceId, candidate);
      if (result.status === 'matched' || result.status === 'ambiguous') return result;
      last = result;
    }
    return last;
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

      const extracted = this.extractEvent(event.payload as ZapZapPayload);
      const phoneToMatch =
        extracted.contactPhone ||
        (extracted.isInbound ? event.sender_phone : event.receiver_phone);

      if (!phoneToMatch) {
        await supabaseAdmin
          .from('zapzap_webhook_events')
          .update({ lead_match_status: 'unmatched' })
          .eq('id', event.id);
        return;
      }

      const matchResult = await this.matchWithDdiFallback(event.workspace_id, phoneToMatch);

      const tableStatus = matchResult.status === 'not_found' ? 'unmatched' : matchResult.status;

      await supabaseAdmin
        .from('zapzap_webhook_events')
        .update({
          lead_id: matchResult.leadId,
          lead_match_status: tableStatus
        })
        .eq('id', event.id);

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
   */
  private static async createInteractionFromEvent(event: WebhookLog) {
    if (!event.lead_id || event.lead_match_status !== 'matched') return;

    try {
      const { createLeadInteraction } = await import("@/modules/prospeccao/services/lead-interactions.service");

      const payload = event.payload as ZapZapPayload;
      const extracted = this.extractEvent(payload);

      const direction = extracted.isInbound ? 'incoming' : 'outgoing';
      const content = extracted.content ?? '';

      await createLeadInteraction(
        event.workspace_id,
        event.lead_id,
        {
          tipo: 'whatsapp',
          descricao: content,
          payload: {
            tipo: 'whatsapp',
            direcao: direction,
            message_id: (event.message_id || extracted.messageId) as string | undefined,
            external_id: (event.external_id || extracted.externalId) as string | undefined,
            chat_id: (event.chat_id || extracted.chatId) as string | undefined,
            sender_phone: (event.sender_phone || extracted.senderPhone) as string | undefined,
            receiver_phone: (event.receiver_phone || extracted.receiverPhone) as string | undefined,
            instance_id: (event.instance_id || extracted.instanceId) as string | undefined,
            provider: event.provider,
            mensagem: content,
            timestamp_whatsapp: extracted.timestamp as string | undefined,
            message_type: (extracted.messageType ?? 'text') as string | undefined,
            metadata: {
              raw_event: event.event,
              pushName: extracted.contactName
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

  static async listLogs(workspaceId: string) {
    const { data, error } = await supabase
      .from('zapzap_webhook_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    return { data: data as WebhookLog[] | null, error };
  }
}
