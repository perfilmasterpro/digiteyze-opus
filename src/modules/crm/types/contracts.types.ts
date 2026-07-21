/**
 * Tipos do módulo CRM — Contratos Comerciais.
 *
 * Um `Contract` está sempre vinculado a uma `Proposal` (`proposal_id`)
 * e — por consequência — a uma `Empresa` (`empresa_id`, denormalizado).
 *
 * Ciclo de status desenhado para preparar (sem implementar agora):
 *  - assinatura digital (transição enviado → assinado)
 *  - integração financeira (contrato assinado → cobrança)
 *  - geração de PDF do contrato
 */

export const CONTRACT_STATUS = [
  "rascunho",
  "emitido",
  "enviado",
  "assinado",
  "cancelado",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUS)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  enviado: "Enviado",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

/** Status ativos — contrato em execução ou em fluxo de assinatura. */
export const CONTRACT_ACTIVE_STATUSES: readonly ContractStatus[] = [
  "emitido",
  "enviado",
  "assinado",
];

export interface Contract {
  id: string;
  workspace_id: string;
  empresa_id: string;
  proposal_id: string;
  numero: string;
  titulo: string;
  status: ContractStatus;
  data_emissao?: string; // ISO
  data_inicio?: string; // ISO
  data_fim?: string; // ISO
  valor?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type ContractInput = Omit<
  Contract,
  "id" | "workspace_id" | "numero" | "created_at" | "updated_at"
>;
