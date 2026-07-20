import type { LeadEvent, LeadEventModule, LeadEventType } from "../types/entities.types";
import type { LeadStatus } from "../types/leads.types";

const STORAGE_KEY = "growth-os:lead-events";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): LeadEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeadEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: LeadEvent[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `evt_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listLeadEvents(
  workspaceId: string,
  leadId: string,
): Promise<LeadEvent[]> {
  return readAll()
    .filter((e) => e.workspace_id === workspaceId && e.lead_id === leadId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export type RecordLeadEventInput = {
  workspaceId: string;
  leadId: string;
  tipo: LeadEventType;
  modulo?: LeadEventModule;
  status_anterior?: LeadStatus;
  status_novo?: LeadStatus;
  descricao?: string;
  created_by?: string;
  created_by_name?: string;
};

export async function recordLeadEvent(input: RecordLeadEventInput): Promise<LeadEvent> {
  const event: LeadEvent = {
    id: generateId(),
    workspace_id: input.workspaceId,
    lead_id: input.leadId,
    tipo: input.tipo,
    modulo: input.modulo ?? "prospeccao",
    status_anterior: input.status_anterior,
    status_novo: input.status_novo,
    descricao: input.descricao,
    created_by: input.created_by,
    created_by_name: input.created_by_name,
    created_at: new Date().toISOString(),
  };
  const list = readAll();
  list.unshift(event);
  writeAll(list);
  return event;
}
