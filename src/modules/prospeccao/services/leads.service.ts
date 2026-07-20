import type { Lead, LeadInput, LeadStatus } from "../types/leads.types";

/**
 * Service do domínio Prospecção (Leads).
 *
 * Implementação temporária baseada em localStorage. As funções recebem
 * `workspaceId` explicitamente para paridade com o filtro RLS
 * (`.eq("workspace_id", …)`) do Supabase e para manter consistência com a
 * queryKey do React Query definida pelo hook consumidor.
 */

const STORAGE_KEY = "growth-os:leads";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Lead[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Lead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Lead[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `lead_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listLeads(workspaceId: string): Promise<Lead[]> {
  return readAll().filter((l) => l.workspace_id === workspaceId);
}

export async function getLead(workspaceId: string, id: string): Promise<Lead | null> {
  const found = readAll().find((l) => l.id === id && l.workspace_id === workspaceId);
  return found ?? null;
}

export async function createLead(workspaceId: string, input: LeadInput): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = {
    ...input,
    id: generateId(),
    workspace_id: workspaceId,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(lead);
  writeAll(list);
  return lead;
}

export async function updateLead(
  workspaceId: string,
  id: string,
  input: LeadInput,
): Promise<Lead> {
  const list = readAll();
  const idx = list.findIndex((l) => l.id === id && l.workspace_id === workspaceId);
  if (idx === -1) throw new Error("Lead não encontrado");
  const updated: Lead = {
    ...list[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function updateLeadStatus(
  workspaceId: string,
  id: string,
  status: LeadStatus,
): Promise<Lead> {
  const list = readAll();
  const idx = list.findIndex((l) => l.id === id && l.workspace_id === workspaceId);
  if (idx === -1) throw new Error("Lead não encontrado");
  const updated: Lead = {
    ...list[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}
