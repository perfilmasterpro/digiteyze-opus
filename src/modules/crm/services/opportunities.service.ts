import type {
  Opportunity,
  OpportunityInput,
  OpportunityStatus,
} from "../types/opportunities.types";

/**
 * Service do domínio CRM — Oportunidades.
 *
 * Persistência atual: `localStorage`. Assinaturas recebem `workspaceId`
 * explicitamente para paridade com o filtro RLS
 * (`.eq("workspace_id", …)`) do Supabase e para manter a queryKey do
 * React Query escopada por workspace.
 */

const STORAGE_KEY = "growth-os:opportunities";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Opportunity[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Opportunity[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Opportunity[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `opp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listOpportunities(
  workspaceId: string,
  empresaId?: string,
): Promise<Opportunity[]> {
  return readAll()
    .filter((o) => o.workspace_id === workspaceId)
    .filter((o) => (empresaId ? o.empresa_id === empresaId : true))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getOpportunity(
  workspaceId: string,
  id: string,
): Promise<Opportunity | null> {
  const found = readAll().find((o) => o.id === id && o.workspace_id === workspaceId);
  return found ?? null;
}

export async function createOpportunity(
  workspaceId: string,
  input: OpportunityInput,
): Promise<Opportunity> {
  const now = new Date().toISOString();
  const opp: Opportunity = {
    ...input,
    id: generateId(),
    workspace_id: workspaceId,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(opp);
  writeAll(list);
  return opp;
}

export async function updateOpportunity(
  workspaceId: string,
  id: string,
  input: OpportunityInput,
): Promise<Opportunity> {
  const list = readAll();
  const idx = list.findIndex((o) => o.id === id && o.workspace_id === workspaceId);
  if (idx === -1) throw new Error("Oportunidade não encontrada");
  const updated: Opportunity = {
    ...list[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function updateOpportunityStatus(
  workspaceId: string,
  id: string,
  status: OpportunityStatus,
): Promise<Opportunity> {
  const list = readAll();
  const idx = list.findIndex((o) => o.id === id && o.workspace_id === workspaceId);
  if (idx === -1) throw new Error("Oportunidade não encontrada");
  const updated: Opportunity = {
    ...list[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function deleteOpportunity(workspaceId: string, id: string): Promise<void> {
  const list = readAll().filter((o) => !(o.id === id && o.workspace_id === workspaceId));
  writeAll(list);
}
