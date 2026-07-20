/**
 * Tipos do módulo CRM — Propostas Comerciais.
 *
 * Uma `Proposal` está sempre vinculada a uma `Opportunity` (`opportunity_id`)
 * e — por consequência — a uma `Empresa` (`empresa_id`, denormalizado para
 * facilitar filtros e a timeline unificada).
 *
 * O ciclo de status foi desenhado para preparar (sem implementar agora):
 *  - geração de PDF a partir de `ProposalItem[]`
 *  - assinatura eletrônica externa (campo `data_resposta` reservado)
 *  - integração futura com módulo Financeiro (proposta aprovada → contrato)
 */

export const PROPOSAL_STATUS = [
  "rascunho",
  "enviada",
  "visualizada",
  "aprovada",
  "recusada",
  "expirada",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUS)[number];

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  expirada: "Expirada",
};

/** Status considerados "em negociação" (contam para KPIs de pipeline). */
export const PROPOSAL_OPEN_STATUSES: readonly ProposalStatus[] = [
  "rascunho",
  "enviada",
  "visualizada",
];

/** Status finais (não sofrem mais transição automática). */
export const PROPOSAL_TERMINAL_STATUSES: readonly ProposalStatus[] = [
  "aprovada",
  "recusada",
  "expirada",
];

export interface ProposalItem {
  id: string;
  proposal_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  total: number;
}

export type ProposalItemInput = Omit<ProposalItem, "id" | "proposal_id" | "total">;

export interface Proposal {
  id: string;
  workspace_id: string;
  empresa_id: string;
  opportunity_id: string;
  titulo: string;
  status: ProposalStatus;
  valor_total: number;
  validade_dias: number;
  data_envio?: string; // ISO — preenchido ao mover para "enviada"
  data_resposta?: string; // ISO — preenchido em aprovada/recusada
  observacoes?: string;
  items: ProposalItem[];
  created_at: string;
  updated_at: string;
}

export type ProposalInput = Omit<
  Proposal,
  "id" | "workspace_id" | "created_at" | "updated_at" | "items" | "valor_total"
> & {
  items: ProposalItemInput[];
};

/** Calcula o total de um item (helper puro). */
export function computeItemTotal(qtd: number, unit: number): number {
  const q = Number.isFinite(qtd) ? qtd : 0;
  const u = Number.isFinite(unit) ? unit : 0;
  return Math.round(q * u * 100) / 100;
}

/** Calcula o total consolidado da proposta a partir dos itens. */
export function computeProposalTotal(items: Pick<ProposalItem, "total">[]): number {
  return Math.round(items.reduce((s, i) => s + (i.total || 0), 0) * 100) / 100;
}
