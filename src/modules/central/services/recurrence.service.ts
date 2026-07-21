/**
 * Recorrência de tarefas — cálculo da próxima ocorrência.
 *
 * Quando uma tarefa com `recurrence_rule` é marcada como concluída,
 * geramos a próxima instância copiando os campos relevantes e
 * atualizando `data` para a próxima ocorrência prevista pela regra.
 */

import { createTask } from "./tasks.service";
import type { RecurrenceRule, Task } from "../types/central.types";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Calcula a próxima data de ocorrência a partir de `from`.
 * Retorna `null` quando ultrapassa `until` ou quando a regra é inválida.
 */
export function computeNextOccurrence(
  rule: RecurrenceRule,
  from: Date,
): string | null {
  const interval = Math.max(1, rule.interval ?? 1);
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);

  let next = new Date(base);
  switch (rule.freq) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly": {
      if (rule.byweekday && rule.byweekday.length > 0) {
        // procura próximo dia da semana selecionado, respeitando interval de semanas
        const sorted = [...rule.byweekday].sort((a, b) => a - b);
        const currentDow = base.getDay();
        const nextInWeek = sorted.find((d) => d > currentDow);
        if (nextInWeek !== undefined) {
          next.setDate(base.getDate() + (nextInWeek - currentDow));
        } else {
          // pula para primeiro dow da próxima "interval-ésima" semana
          const daysToNextWeekStart = 7 - currentDow + sorted[0]!;
          next.setDate(base.getDate() + daysToNextWeekStart + (interval - 1) * 7);
        }
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
      break;
    }
    case "monthly": {
      next.setMonth(next.getMonth() + interval);
      if (rule.bymonthday) {
        const daysInMonth = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0,
        ).getDate();
        next.setDate(Math.min(rule.bymonthday, daysInMonth));
      }
      break;
    }
    case "custom":
      // Comportamento padrão: trata como daily * interval
      next.setDate(next.getDate() + interval);
      break;
  }

  if (rule.until) {
    const until = new Date(`${rule.until}T00:00:00`);
    if (next > until) return null;
  }
  return toDateStr(next);
}

/**
 * Gera a próxima instância de uma tarefa recorrente após a conclusão da
 * instância corrente. `originalTask` pode ser a instância ou o template raiz.
 * Retorna a nova task criada, ou `null` quando a regra terminou.
 */
export async function spawnNextRecurringTask(
  workspaceId: string,
  userId: string,
  originalTask: Task,
): Promise<Task | null> {
  const rule = originalTask.recurrence_rule;
  if (!rule) return null;
  const from = originalTask.data
    ? new Date(`${originalTask.data}T00:00:00`)
    : new Date();
  const nextData = computeNextOccurrence(rule, from);
  if (!nextData) return null;

  const parentId = originalTask.recurrence_parent_id ?? originalTask.id;
  // Reuse tasks.service.createTask — inclui recurrence_rule para permitir a próxima
  const created = await createTask(workspaceId, userId, {
    titulo: originalTask.titulo,
    descricao: originalTask.descricao,
    categoria: originalTask.categoria,
    prioridade: originalTask.prioridade,
    origem: originalTask.origem,
    origem_ref_tipo: originalTask.origem_ref_tipo,
    origem_ref_id: originalTask.origem_ref_id,
    modulo_relacionado: originalTask.modulo_relacionado,
    projeto: originalTask.projeto,
    responsavel_id: originalTask.responsavel_id,
    data: nextData,
    hora_inicio: originalTask.hora_inicio,
    hora_fim: originalTask.hora_fim,
    prazo: originalTask.prazo,
    observacoes: originalTask.observacoes,
    recurrence_rule: rule,
  });
  // patch para amarrar recurrence_parent_id (não exposto no TaskInput público)
  const { supabase } = await import("@/integrations/supabase/client");
  await supabase
    .from("tasks")
    .update({ recurrence_parent_id: parentId })
    .eq("id", created.id);
  return { ...created, recurrence_parent_id: parentId };
}

export function describeRecurrence(rule: RecurrenceRule): string {
  const interval = Math.max(1, rule.interval ?? 1);
  const daysLabel = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  switch (rule.freq) {
    case "daily":
      return interval === 1 ? "Todos os dias" : `A cada ${interval} dias`;
    case "weekly": {
      const dias = rule.byweekday?.map((d) => daysLabel[d]).join(", ");
      const base = interval === 1 ? "Semanal" : `A cada ${interval} semanas`;
      return dias ? `${base} — ${dias}` : base;
    }
    case "monthly":
      return rule.bymonthday
        ? `Mensal — dia ${rule.bymonthday}${interval > 1 ? ` (a cada ${interval} meses)` : ""}`
        : interval === 1
          ? "Mensal"
          : `A cada ${interval} meses`;
    case "custom":
      return `Personalizada — a cada ${interval} dias`;
  }
}
