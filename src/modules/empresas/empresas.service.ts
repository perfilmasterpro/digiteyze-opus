import type { Empresa, EmpresaInput } from "./empresas.types";

/**
 * Service do domínio Empresas.
 *
 * Implementação temporária baseada em localStorage. Será substituída
 * pela integração com o backend (Lovable Cloud + RLS multi-tenant)
 * mantendo a mesma assinatura pública.
 */

const STORAGE_KEY = "growth-os:empresas";
const CURRENT_WORKSPACE_ID = "default";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Empresa[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Empresa[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Empresa[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `emp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listEmpresas(): Promise<Empresa[]> {
  return readAll().filter((e) => e.workspace_id === CURRENT_WORKSPACE_ID);
}

export async function createEmpresa(input: EmpresaInput): Promise<Empresa> {
  const now = new Date().toISOString();
  const empresa: Empresa = {
    ...input,
    id: generateId(),
    workspace_id: CURRENT_WORKSPACE_ID,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(empresa);
  writeAll(list);
  return empresa;
}

export async function updateEmpresa(id: string, input: EmpresaInput): Promise<Empresa> {
  const list = readAll();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Empresa não encontrada");
  const updated: Empresa = {
    ...list[idx],
    ...input,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function archiveEmpresa(id: string): Promise<Empresa> {
  const list = readAll();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Empresa não encontrada");
  const updated: Empresa = {
    ...list[idx],
    status: "arquivado",
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}
