import { z } from "zod";

import { LEAD_ORIGENS, LEAD_STATUS } from "../types/leads.types";

export const leadSchema = z.object({
  nome_empresa: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  status: z.enum(LEAD_STATUS),
  origem: z.enum(LEAD_ORIGENS),
  responsavel: z.string().trim().min(2, "Informe o responsável"),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  estado: z.string().trim().max(40).optional().or(z.literal("")),
  site: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  instagram: z.string().trim().max(80).optional().or(z.literal("")),
  telefone: z.string().trim().max(32).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(32).optional().or(z.literal("")),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  proxima_acao: z.string().trim().max(200).optional().or(z.literal("")),
  data_proxima_acao: z.string().trim().max(40).optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
