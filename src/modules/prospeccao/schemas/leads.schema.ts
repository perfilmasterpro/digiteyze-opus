import { z } from "zod";

import {
  LEAD_ORIGENS,
  LEAD_PORTES,
  LEAD_STATUS,
  LEAD_TEMPERATURAS,
  UFS,
} from "../types/leads.types";

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const leadSchema = z.object({
  // Essenciais
  nome_empresa: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  status: z.enum(LEAD_STATUS),
  origem: z.enum(LEAD_ORIGENS),
  responsavel: z.string().trim().min(2, "Informe o responsável"),
  // Contato principal
  contato_nome: optionalString(120),
  contato_cargo: optionalString(80),
  contato_email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  telefone: optionalString(32),
  // B2B / complementares
  cnpj: optionalString(20),
  segmento: optionalString(80),
  porte: z.enum(LEAD_PORTES).optional().or(z.literal("")),
  temperatura: z.enum(LEAD_TEMPERATURAS).optional().or(z.literal("")),
  valor_potencial: z
    .union([z.number().nonnegative(), z.literal(""), z.nan()])
    .optional(),
  cidade: optionalString(80),
  estado: z.enum(UFS).optional().or(z.literal("")),
  site: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  instagram: optionalString(80),
  whatsapp: optionalString(32),
  observacoes: optionalString(2000),
  proxima_acao: optionalString(200),
  // Data ISO yyyy-MM-dd emitida pelo input type="date"
  data_proxima_acao: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
    .optional()
    .or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
