import { z } from "zod";

import { CONTRACT_STATUS } from "../types/contracts.types";

/**
 * Schema Zod do Contrato — usado pelo drawer de cadastro/edição.
 *
 * `numero` é gerado pelo service (não faz parte do formulário).
 */
export const contractSchema = z.object({
  empresa_id: z.string().min(1),
  proposal_id: z.string().min(1),
  titulo: z.string().min(2, "Título muito curto").max(160),
  status: z.enum(CONTRACT_STATUS),
  data_emissao: z.string().optional().or(z.literal("")),
  data_inicio: z.string().optional().or(z.literal("")),
  data_fim: z.string().optional().or(z.literal("")),
  valor: z
    .number({ invalid_type_error: "Valor inválido" })
    .min(0, "Valor deve ser ≥ 0")
    .optional(),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
});

export type ContractFormValues = z.infer<typeof contractSchema>;
