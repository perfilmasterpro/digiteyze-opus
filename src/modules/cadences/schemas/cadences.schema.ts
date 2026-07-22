import { z } from "zod";

import { CADENCE_STATUS, CADENCE_STEP_TIPOS } from "../types/cadences.types";

export const cadenceStepSchema = z.object({
  id: z.string().optional(),
  ordem: z.number().int().min(1),
  nome: z.string().trim().min(1, "Informe o nome da etapa"),
  categoria_id: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  tipo_acao: z.enum(CADENCE_STEP_TIPOS),
  tempo_espera_dias: z.number().int().min(0).max(365),
  descricao: z.string().trim().max(2000).nullable().optional(),
});

export const cadenceSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da cadência"),
  descricao: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(CADENCE_STATUS),
  steps: z.array(cadenceStepSchema).min(1, "Adicione pelo menos uma etapa"),
});

export type CadenceFormValues = z.infer<typeof cadenceSchema>;
