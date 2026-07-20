import { getCurrentWorkspaceId } from "@/lib/workspace";

import type { Empresa, EmpresaInput } from "./empresas.types";

/**
 * Service do domínio Empresas.
 *
 * Implementação temporária baseada em localStorage. Será substituída
 * pela integração com o backend (Lovable Cloud + RLS multi-tenant)
 * mantendo a mesma assinatura pública.
 */

const STORAGE_KEY = "growth-os:empresas";

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
  const workspaceId = getCurrentWorkspaceId();
  return readAll().filter((e) => e.workspace_id === workspaceId);
}

export async function getEmpresa(id: string): Promise<Empresa | null> {
  const workspaceId = getCurrentWorkspaceId();
  const found = readAll().find((e) => e.id === id && e.workspace_id === workspaceId);
  return found ?? null;
}

export async function createEmpresa(input: EmpresaInput): Promise<Empresa> {
  const now = new Date().toISOString();
  const empresa: Empresa = {
    ...input,
    id: generateId(),
    workspace_id: getCurrentWorkspaceId(),
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
  return setEmpresaStatus(id, "arquivado");
}

export async function reactivateEmpresa(id: string): Promise<Empresa> {
  return setEmpresaStatus(id, "ativo");
}

async function setEmpresaStatus(id: string, status: Empresa["status"]): Promise<Empresa> {
  const list = readAll();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Empresa não encontrada");
  const updated: Empresa = {
    ...list[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}
