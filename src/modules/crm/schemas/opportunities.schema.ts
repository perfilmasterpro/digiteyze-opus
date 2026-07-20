import { z } from "zod";

import {
  OPPORTUNITY_MOTIVOS_PERDA,
  OPPORTUNITY_ORIGENS,
  OPPORTUNITY_PROBABILIDADES,
  OPPORTUNITY_STATUS,
} from "../types/opportunities.types";

/**
 * Schema Zod da Oportunidade — usado pelo drawer de cadastro.
 *
 * Regras:
 *  - `motivo_perda` só é obrigatório quando `status === "perdido"`.
 *  - `valor_estimado` deve ser ≥ 0.
 */
export const opportunitySchema = z
  .object({
    empresa_id: z.string().min(1, "Selecione uma empresa"),
    nome: z.string().min(2, "Nome muito curto").max(160),
    status: z.enum(OPPORTUNITY_STATUS),
    origem: z.enum(OPPORTUNITY_ORIGENS),
    valor_estimado: z
      .number({ invalid_type_error: "Informe um valor numérico" })
      .min(0, "Valor deve ser ≥ 0"),
    probabilidade: z.union(
      OPPORTUNITY_PROBABILIDADES.map((p) => z.literal(p)) as unknown as [
        z.ZodLiteral<number>,
        z.ZodLiteral<number>,
        ...z.ZodLiteral<number>[],
      ],
    ),
    responsavel_id: z.string().optional().or(z.literal("")),
    responsavel_nome: z.string().optional().or(z.literal("")),
    data_fechamento_prevista: z.string().optional().or(z.literal("")),
    motivo_perda: z
      .union([z.enum(OPPORTUNITY_MOTIVOS_PERDA), z.literal("")])
      .optional(),
    observacoes: z.string().max(2000).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.status === "perdido" && !v.motivo_perda) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo_perda"],
        message: "Informe o motivo da perda",
      });
    }
  });

export type OpportunityFormValues = z.infer<typeof opportunitySchema>;
