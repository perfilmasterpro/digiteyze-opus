import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventRow,
} from "../types/central.types";

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  const participantesRaw = row.participantes;
  const participantes = Array.isArray(participantesRaw)
    ? (participantesRaw as unknown[]).filter((v): v is string => typeof v === "string")
    : null;
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    criado_por: row.criado_por,
    titulo: row.titulo,
    descricao: row.descricao,
    tipo: row.tipo,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    local: row.local,
    participantes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listCalendarEvents(
  workspaceId: string,
  range?: { from?: string; to?: string },
): Promise<CalendarEvent[]> {
  let q = supabase
    .from("calendar_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true, nullsFirst: true });
  if (range?.from) q = q.gte("data", range.from);
  if (range?.to) q = q.lte("data", range.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => rowToEvent(r as CalendarEventRow));
}

export async function createCalendarEvent(
  workspaceId: string,
  userId: string,
  input: CalendarEventInput,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      workspace_id: workspaceId,
      criado_por: userId,
      titulo: input.titulo,
      descricao: input.descricao ?? null,
      tipo: input.tipo,
      data: input.data,
      hora_inicio: input.hora_inicio ?? null,
      hora_fim: input.hora_fim ?? null,
      local: input.local ?? null,
      participantes: (input.participantes ?? null) as unknown as Json,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToEvent(data as CalendarEventRow);
}

export async function updateCalendarEvent(
  workspaceId: string,
  id: string,
  patch: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  const payload: Record<string, unknown> = { ...patch };
  if ("participantes" in patch) {
    payload.participantes = (patch.participantes ?? null) as unknown as Json;
  }
  const { data, error } = await supabase
    .from("calendar_events")
    .update(payload)
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToEvent(data as CalendarEventRow);
}

export async function deleteCalendarEvent(
  workspaceId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("id", id);
  if (error) throw error;
}
