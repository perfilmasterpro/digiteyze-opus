/**
 * Lead Tasks — persistidas na tabela central `tasks` para que apareçam
 * automaticamente na Central de Tarefas. O vínculo com o lead é feito via
 * `origem='lead'` + `origem_ref_tipo='lead'` + `origem_ref_id=<leadId>`.
 *
 * A UI da ficha do lead continua consumindo o tipo `LeadTask` (subset).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskRow } from "@/modules/central/types/central.types";

import type {
  LeadTask,
  LeadTaskInput,
  LeadTaskPrioridade,
  LeadTaskStatus,
} from "../types/entities.types";

const SELECT = "*";

/** Central prioridade → LeadTask prioridade (downcast: "urgente" vira "alta"). */
function toLeadPrioridade(p: Task["prioridade"]): LeadTaskPrioridade {
  return p === "urgente" ? "alta" : (p as LeadTaskPrioridade);
}

/** LeadTask status é subset do central; qualquer status extra vira "pendente". */
function toLeadStatus(s: Task["status"]): LeadTaskStatus {
  if (s === "concluida" || s === "cancelada") return s;
  return "pendente";
}

function rowToLeadTask(row: TaskRow): LeadTask {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    lead_id: row.origem_ref_id ?? "",
    titulo: row.titulo,
    data: (row.prazo ?? row.data) ?? undefined,
    status: toLeadStatus(row.status),
    prioridade: toLeadPrioridade(row.prioridade),
    responsavel_id: row.responsavel_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listLeadTasks(
  workspaceId: string,
  leadId: string,
): Promise<LeadTask[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .eq("workspace_id", workspaceId)
    .eq("origem_ref_tipo", "lead")
    .eq("origem_ref_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const items = (data ?? []).map((r) => rowToLeadTask(r as TaskRow));
  return items.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "pendente") return -1;
      if (b.status === "pendente") return 1;
    }
    const ad = a.data ?? "9999";
    const bd = b.data ?? "9999";
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });
}

export async function createLeadTask(
  workspaceId: string,
  leadId: string,
  input: LeadTaskInput,
): Promise<LeadTask> {
  const prioridade: LeadTaskPrioridade = input.prioridade ?? "media";
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspaceId,
      criado_por: input.responsavel_id ?? null,
      responsavel_id: input.responsavel_id ?? null,
      titulo: input.titulo,
      categoria: "comercial",
      status: "pendente",
      prioridade,
      origem: "lead",
      origem_ref_tipo: "lead",
      origem_ref_id: leadId,
      modulo_relacionado: "prospeccao",
      data: input.data ?? null,
      prazo: input.data ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToLeadTask(data as TaskRow);
}

export async function updateLeadTaskStatus(
  workspaceId: string,
  id: string,
  status: LeadTaskStatus,
): Promise<LeadTask> {
  const patch: {
    status: LeadTaskStatus;
    completed_at: string | null;
  } = {
    status,
    completed_at: status === "concluida" ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return rowToLeadTask(data as TaskRow);
}
