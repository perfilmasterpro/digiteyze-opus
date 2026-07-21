import {
  type Contract,
  type ContractInput,
} from "../types/contracts.types";

/**
 * Service do domínio CRM — Contratos Comerciais.
 *
 * Persistência atual: `localStorage`. Assinaturas recebem `workspaceId`
 * explicitamente para paridade com o filtro RLS Supabase e para manter
 * as queryKeys do React Query escopadas por workspace.
 *
 * O `numero` humano (`CONT-YYYYMM-XXXXXX`) é gerado internamente e
 * permanece estável mesmo após migração para Supabase.
 */

const STORAGE_KEY = "growth-os:contracts";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Contract[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Contract[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Contract[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId(prefix: string) {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function generateNumero(id: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const short = id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `CONT-${y}${m}-${short || "000000"}`;
}

function sanitize(input: ContractInput) {
  return {
    empresa_id: input.empresa_id,
    proposal_id: input.proposal_id,
    titulo: input.titulo.trim(),
    status: input.status,
    data_emissao: input.data_emissao || undefined,
    data_inicio: input.data_inicio || undefined,
    data_fim: input.data_fim || undefined,
    valor: typeof input.valor === "number" ? input.valor : undefined,
    observacoes: input.observacoes?.toString().trim() || undefined,
  };
}

export async function listContracts(
  workspaceId: string,
  filters?: { opportunityId?: string; empresaId?: string; proposalId?: string },
): Promise<Contract[]> {
  return readAll()
    .filter((c) => c.workspace_id === workspaceId)
    .filter((c) =>
      filters?.proposalId ? c.proposal_id === filters.proposalId : true,
    )
    .filter((c) => (filters?.empresaId ? c.empresa_id === filters.empresaId : true))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getContract(
  workspaceId: string,
  id: string,
): Promise<Contract | null> {
  return (
    readAll().find((c) => c.id === id && c.workspace_id === workspaceId) ?? null
  );
}

export async function createContract(
  workspaceId: string,
  input: ContractInput,
): Promise<Contract> {
  const now = new Date().toISOString();
  const id = generateId("cnt");
  const data = sanitize(input);
  const contract: Contract = {
    id,
    workspace_id: workspaceId,
    numero: generateNumero(id),
    ...data,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(contract);
  writeAll(list);
  return contract;
}

export async function updateContract(
  workspaceId: string,
  id: string,
  input: ContractInput,
): Promise<Contract> {
  const list = readAll();
  const idx = list.findIndex(
    (c) => c.id === id && c.workspace_id === workspaceId,
  );
  if (idx === -1) throw new Error("Contrato não encontrado");
  const data = sanitize(input);
  const updated: Contract = {
    ...list[idx],
    ...data,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function deleteContract(
  workspaceId: string,
  id: string,
): Promise<void> {
  const list = readAll().filter(
    (c) => !(c.id === id && c.workspace_id === workspaceId),
  );
  writeAll(list);
}
