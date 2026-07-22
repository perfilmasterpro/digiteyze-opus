import { z } from "zod";

export const messageTemplateSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, "Informe um título com pelo menos 2 caracteres.")
    .max(120, "Título muito longo (máx. 120 caracteres)."),
  categoria: z
    .string()
    .trim()
    .min(1, "Selecione uma categoria.")
    .max(40, "Categoria inválida."),
  corpo: z
    .string()
    .trim()
    .min(4, "Escreva o conteúdo da mensagem.")
    .max(4000, "Mensagem muito longa (máx. 4000 caracteres)."),
  ativo: z.boolean(),
});

export type MessageTemplateFormValues = z.infer<typeof messageTemplateSchema>;
