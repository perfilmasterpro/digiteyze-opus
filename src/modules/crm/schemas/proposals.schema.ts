import { z } from "zod";

import { PROPOSAL_STATUS } from "../types/proposals.types";

/**
 * Schema Zod da Proposta — usado pelo drawer de cadastro/edição.
 *
 * `data_envio` e `data_resposta` são gerenciados pelas transições de status
 * (mutations `send/approve/reject`), não pelo formulário direto.
 */
export const proposalItemSchema = z.object({
  descricao: z.string().min(1, "Descreva o item").max(240),
  quantidade: z
    .number({ invalid_type_error: "Quantidade inválida" })
    .min(0.01, "Quantidade deve ser > 0"),
  valor_unitario: z
    .number({ invalid_type_error: "Valor inválido" })
    .min(0, "Valor deve ser ≥ 0"),
});

export const proposalSchema = z.object({
  empresa_id: z.string().min(1),
  opportunity_id: z.string().min(1),
  titulo: z.string().min(2, "Título muito curto").max(160),
  status: z.enum(PROPOSAL_STATUS),
  validade_dias: z
    .number({ invalid_type_error: "Informe um número" })
    .int("Deve ser inteiro")
    .min(1, "Mínimo 1 dia")
    .max(365, "Máximo 365 dias"),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
  items: z
    .array(proposalItemSchema)
    .min(1, "Adicione pelo menos 1 item"),
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;
export type ProposalItemFormValues = z.infer<typeof proposalItemSchema>;
