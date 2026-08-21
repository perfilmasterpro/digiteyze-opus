import { normalizePhone } from "@/lib/utils";

export interface LeadMatchResult {
  status: 'matched' | 'not_found' | 'ambiguous';
  leadId: string | null;
  phone: string;
  candidates?: string[];
}

export class LeadMatcherService {
  /**
   * Identifica um Lead com base no telefone e workspace.
   * Regra: Prioridade WhatsApp -> Fallback Telefone.
   */
  static async matchLead(
    workspaceId: string,
    phone: string
  ): Promise<LeadMatchResult> {
    const normalizedTarget = normalizePhone(phone);
    
    if (!normalizedTarget) {
      return {
        status: 'not_found',
        leadId: null,
        phone: normalizedTarget
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Buscar todos os leads do workspace (considerando volume controlável por workspace)
    // Para otimização futura, poderíamos usar uma função RPC no Postgres que já faz a normalização e busca.
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('id, data')
      .eq('workspace_id', workspaceId);

    if (error || !leads || leads.length === 0) {
      return {
        status: 'not_found',
        leadId: null,
        phone: normalizedTarget
      };
    }

    // 2. Tentar Match via WhatsApp
    const whatsappMatches = leads.filter(lead => {
      const wpp = (lead.data as any)?.whatsapp;
      return wpp && normalizePhone(wpp) === normalizedTarget;
    });

    if (whatsappMatches.length === 1) {
      return {
        status: 'matched',
        leadId: whatsappMatches[0].id,
        phone: normalizedTarget
      };
    }

    if (whatsappMatches.length > 1) {
      return {
        status: 'ambiguous',
        leadId: null,
        phone: normalizedTarget,
        candidates: whatsappMatches.map(l => l.id)
      };
    }

    // 3. Fallback: Match via Telefone
    const phoneMatches = leads.filter(lead => {
      const tel = (lead.data as any)?.telefone || (lead.data as any)?.phone;
      return tel && normalizePhone(tel) === normalizedTarget;
    });

    if (phoneMatches.length === 1) {
      return {
        status: 'matched',
        leadId: phoneMatches[0].id,
        phone: normalizedTarget
      };
    }

    if (phoneMatches.length > 1) {
      return {
        status: 'ambiguous',
        leadId: null,
        phone: normalizedTarget,
        candidates: phoneMatches.map(l => l.id)
      };
    }

    return {
      status: 'not_found',
      leadId: null,
      phone: normalizedTarget
    };
  }
}
