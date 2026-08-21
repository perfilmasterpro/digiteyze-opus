import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/utils";
export class WebhookService {
    /**
     * Registra um novo webhook no banco de dados.
     * EXCLUSIVAMENTE para a Fase 3: Recebimento e Persistência Segura.
     */
    static async logWebhook(workspaceId, provider, payload) {
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
                payload: payload,
                status: 'pending'
            })
                .select()
                .single();
            // Se for erro de duplicidade (23505), retornamos sucesso (idempotência)
            if (error && error.code === '23505') {
                console.log(`[Webhook] Evento duplicado ignorado: ${externalId}`);
                return { data: { status: 'duplicate' }, error: null };
            }
            if (data) {
                // Fase 4: Identificação do Lead (Executada de forma síncrona para garantir persistência)
                await this.identifyLead(workspaceId, data.id, senderPhone);
            }
            return { data, error };
        }
        catch (err) {
            console.error('Error logging webhook:', err);
            return { data: null, error: err };
        }
    }
    /**
     * Identifica e associa um Lead ao evento do webhook com base no telefone.
     */
    static async identifyLead(workspaceId, eventId, rawPhone) {
        if (!rawPhone)
            return;
        try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const normalizedPhone = normalizePhone(rawPhone);
            // Busca por leads que possuam o telefone ou whatsapp normalizado correspondente no workspace
            const { data: leads, error } = await supabaseAdmin
                .from('leads')
                .select('id, data')
                .eq('workspace_id', workspaceId);
            if (error || !leads)
                return;
            const matches = leads.filter(lead => {
                const leadData = lead.data;
                const leadTel = normalizePhone(leadData?.telefone || leadData?.phone);
                const leadWpp = normalizePhone(leadData?.whatsapp);
                return leadTel === normalizedPhone || leadWpp === normalizedPhone;
            });
            let status = 'unmatched';
            let leadId = null;
            if (matches.length === 1) {
                status = 'matched';
                leadId = matches[0].id;
            }
            else if (matches.length > 1) {
                status = 'ambiguous';
            }
            await supabaseAdmin
                .from('zapzap_webhook_events')
                .update({
                lead_id: leadId,
                lead_match_status: status
            })
                .eq('id', eventId);
        }
        catch (err) {
            console.error('[Webhook] Lead identification failed:', err);
        }
    }
    static async listLogs(workspaceId) {
        const { data, error } = await supabase
            .from('zapzap_webhook_events')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
        return { data: data, error };
    }
}
