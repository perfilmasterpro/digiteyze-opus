import { z } from "zod";

import {
  RECURRENCE_FREQS,
  TASK_CATEGORIAS,
  TASK_ORIGENS,
  TASK_PRIORIDADES,
  TASK_STATUS,
  CALENDAR_EVENT_TIPOS,
} from "../types/central.types";

export const recurrenceRuleSchema = z
  .object({
    freq: z.enum(RECURRENCE_FREQS),
    interval: z.number().int().positive(),
    byweekday: z.array(z.number().int().min(0).max(6)).optional(),
    bymonthday: z.number().int().min(1).max(31).optional(),
    until: z.string().optional(),
  })
  .nullable()
  .optional();

export const taskSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título"),
  descricao: z.string().trim().max(4000).nullable().optional(),
  categoria: z.enum(TASK_CATEGORIAS),
  status: z.enum(TASK_STATUS),
  prioridade: z.enum(TASK_PRIORIDADES),
  origem: z.enum(TASK_ORIGENS),
  origem_ref_tipo: z.string().nullable().optional(),
  origem_ref_id: z.string().nullable().optional(),
  modulo_relacionado: z.string().nullable().optional(),
  projeto: z.string().nullable().optional(),
  responsavel_id: z.string().nullable().optional(),
  data: z.string().nullable().optional(),
  hora_inicio: z.string().nullable().optional(),
  hora_fim: z.string().nullable().optional(),
  prazo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  recurrence_rule: recurrenceRuleSchema,
});
export type TaskFormValues = z.infer<typeof taskSchema>;

export const calendarEventSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título"),
  descricao: z.string().nullable().optional(),
  tipo: z.enum(CALENDAR_EVENT_TIPOS),
  data: z.string().min(1, "Informe a data"),
  hora_inicio: z.string().nullable().optional(),
  hora_fim: z.string().nullable().optional(),
  local: z.string().nullable().optional(),
  participantes: z.array(z.string()).nullable().optional(),
});
export type CalendarEventFormValues = z.infer<typeof calendarEventSchema>;

export const commentSchema = z.object({
  corpo: z.string().trim().min(1, "Escreva um comentário").max(2000),
});
export type CommentFormValues = z.infer<typeof commentSchema>;

export const checklistItemSchema = z.object({
  titulo: z.string().trim().min(1, "Descreva o item"),
});
export type ChecklistItemFormValues = z.infer<typeof checklistItemSchema>;
