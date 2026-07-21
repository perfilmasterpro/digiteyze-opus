import { z } from "zod";

import { MESSAGE_TEMPLATE_CATEGORIAS } from "../types/message-templates.types";

export const messageTemplateSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, "Informe um título com pelo menos 2 caracteres.")
    .max(120, "Título muito longo (máx. 120 caracteres)."),
  categoria: z.enum(MESSAGE_TEMPLATE_CATEGORIAS),
  corpo: z
    .string()
    .trim()
    .min(4, "Escreva o conteúdo da mensagem.")
    .max(4000, "Mensagem muito longa (máx. 4000 caracteres)."),
  ativo: z.boolean().default(true),
});

export type MessageTemplateFormValues = z.infer<typeof messageTemplateSchema>;
