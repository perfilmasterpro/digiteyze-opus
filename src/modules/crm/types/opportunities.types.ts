/**
 * Tipos do módulo CRM — Oportunidades.
 *
 * Uma Opportunity vive sempre vinculada a uma Empresa (`empresa_id`) — o
 * módulo Empresas é a entidade âncora do Growth OS. O CRM cuida do pipeline
 * comercial pós-conversão do Lead; propostas, contratos e financeiro NÃO
 * pertencem a este módulo.
 */

export const OPPORTUNITY_STATUS = [
  "aberto",
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[number];

export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  aberto: "Aberto",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

/** Estágios visíveis no Kanban (spec Sprint 4.0). */
export const OPPORTUNITY_KANBAN_STAGES = [
  "qualificado",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const satisfies readonly OpportunityStatus[];

export const OPPORTUNITY_OPEN_STATUSES: readonly OpportunityStatus[] = [
  "aberto",
  "qualificado",
  "proposta",
  "negociacao",
];

export const OPPORTUNITY_ORIGENS = [
  "prospeccao",
  "indicacao",
  "inbound",
  "outbound",
  "parceiro",
] as const;
export type OpportunityOrigem = (typeof OPPORTUNITY_ORIGENS)[number];

export const OPPORTUNITY_ORIGEM_LABEL: Record<OpportunityOrigem, string> = {
  prospeccao: "Prospecção",
  indicacao: "Indicação",
  inbound: "Inbound",
  outbound: "Outbound",
  parceiro: "Parceiro",
};

export const OPPORTUNITY_MOTIVOS_PERDA = [
  "preco",
  "concorrente",
  "sem_orcamento",
  "sem_interesse",
  "timing",
  "outro",
] as const;
export type OpportunityMotivoPerda = (typeof OPPORTUNITY_MOTIVOS_PERDA)[number];

export const OPPORTUNITY_MOTIVO_PERDA_LABEL: Record<OpportunityMotivoPerda, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  sem_orcamento: "Sem orçamento",
  sem_interesse: "Sem interesse",
  timing: "Timing",
  outro: "Outro",
};

export const OPPORTUNITY_PROBABILIDADES = [10, 25, 50, 75, 90, 100] as const;
export type OpportunityProbabilidade = (typeof OPPORTUNITY_PROBABILIDADES)[number];

export interface Opportunity {
  id: string;
  workspace_id: string;
  empresa_id: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  nome: string;
  status: OpportunityStatus;
  origem: OpportunityOrigem;
  valor_estimado: number;
  probabilidade: OpportunityProbabilidade;
  data_fechamento_prevista?: string; // ISO date
  motivo_perda?: OpportunityMotivoPerda;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type OpportunityInput = Omit<
  Opportunity,
  "id" | "workspace_id" | "created_at" | "updated_at"
>;
