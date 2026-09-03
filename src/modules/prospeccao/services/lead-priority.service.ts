export type LeadPriorityLevel = 'alta' | 'media' | 'baixa';

export interface LeadPriorityInput {
  /** Dados básicos do prospect. */
  nome?: string | null;
  empresa_nome?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  cidade?: string | null;
  estado?: string | null;
  /** Sinais comerciais já existentes no lead. */
  status?: string | null;
  origem?: string | null;
  /** Permite incorporar sinais externos sem alterar o schema do Lead. */
  sinais?: {
    respondeu?: boolean;
    demonstrou_interesse?: boolean;
    pediu_proposta?: boolean;
    tem_reuniao?: boolean;
    ultimo_contato_dias?: number | null;
    followup_vencido?: boolean;
  };
}

export interface LeadPriorityResult {
  score: number;
  nivel: LeadPriorityLevel;
  motivos: string[];
}

/**
 * Priorização determinística e explicável para a operação diária.
 * Não grava nada no banco e não substitui o futuro Lead Score com IA.
 */
export function calculateLeadPriority(input: LeadPriorityInput): LeadPriorityResult {
  let score = 0;
  const motivos: string[] = [];

  const hasContact = Boolean(input.whatsapp || input.telefone);
  const hasCompany = Boolean(input.empresa_nome || input.nome);
  const hasDigitalPresence = Boolean(input.website || input.email);

  if (hasContact) {
    score += 20;
    motivos.push('possui telefone/WhatsApp');
  }
  if (hasCompany) {
    score += 10;
    motivos.push('prospect identificado');
  }
  if (hasDigitalPresence) {
    score += 10;
    motivos.push('possui canal digital');
  }

  const status = (input.status || '').toLowerCase();
  if (['qualificado', 'proposta', 'negociacao'].includes(status)) {
    score += 25;
    motivos.push('está em etapa comercial avançada');
  } else if (status === 'aberto' || status === 'novo') {
    score += 5;
  }

  const sinais = input.sinais;
  if (sinais?.respondeu) {
    score += 15;
    motivos.push('já respondeu');
  }
  if (sinais?.demonstrou_interesse) {
    score += 20;
    motivos.push('demonstrou interesse');
  }
  if (sinais?.pediu_proposta) {
    score += 25;
    motivos.push('pediu proposta');
  }
  if (sinais?.tem_reuniao) {
    score += 30;
    motivos.push('possui reunião');
  }
  if (sinais?.followup_vencido) {
    score += 10;
    motivos.push('follow-up pendente');
  }

  if (typeof sinais?.ultimo_contato_dias === 'number') {
    if (sinais.ultimo_contato_dias >= 7) {
      score += 8;
      motivos.push('está há vários dias sem contato');
    }
  }

  score = Math.min(100, score);
  const nivel: LeadPriorityLevel = score >= 70 ? 'alta' : score >= 40 ? 'media' : 'baixa';

  return { score, nivel, motivos };
}
