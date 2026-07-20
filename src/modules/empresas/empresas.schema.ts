import { z } from "zod";

import { EMPRESA_ORIGENS, EMPRESA_STATUS, EMPRESA_TIPOS } from "./empresas.types";

export const empresaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  tipo: z.enum(EMPRESA_TIPOS),
  status: z.enum(EMPRESA_STATUS),
  responsavel: z.string().trim().min(2, "Informe o responsável"),
  origem: z.enum(EMPRESA_ORIGENS),
  documento: z.string().trim().max(32).optional().or(z.literal("")),
  site: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().max(32).optional().or(z.literal("")),
  segmento: z.string().trim().max(80).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  estado: z.string().trim().max(40).optional().or(z.literal("")),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
  // Rastreabilidade — não editáveis pelo formulário, definidos pela conversão de leads.
  lead_origem_id: z.string().optional(),
  data_conversao: z.string().optional(),
});

export type EmpresaFormValues = z.infer<typeof empresaSchema>;
