import type {
  LeadInteraction,
  LeadInteractionInput,
} from "../types/entities.types";

const STORAGE_KEY = "growth-os:lead-interactions";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): LeadInteraction[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeadInteraction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: LeadInteraction[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `int_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listLeadInteractions(
  workspaceId: string,
  leadId: string,
): Promise<LeadInteraction[]> {
  return readAll()
    .filter((i) => i.workspace_id === workspaceId && i.lead_id === leadId)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
}

export async function createLeadInteraction(
  workspaceId: string,
  leadId: string,
  input: LeadInteractionInput,
): Promise<LeadInteraction> {
  const now = new Date().toISOString();
  const interaction: LeadInteraction = {
    id: generateId(),
    workspace_id: workspaceId,
    lead_id: leadId,
    tipo: input.tipo,
    data: input.data,
    descricao: input.descricao,
    responsavel_id: input.responsavel_id,
    created_at: now,
  };
  const list = readAll();
  list.unshift(interaction);
  writeAll(list);
  return interaction;
}
