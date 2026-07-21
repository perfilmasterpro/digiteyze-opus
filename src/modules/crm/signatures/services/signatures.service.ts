import {
  type Signature,
  type SignatureInput,
  type SignatureStatus,
} from "../types/signatures.types";

/**
 * Service do submódulo CRM — Assinaturas.
 *
 * Persistência atual: `localStorage`. `workspaceId` sempre explícito para
 * paridade com RLS Supabase futura e para escopar as queryKeys do React
 * Query. Sem React, sem TanStack Query — apenas CRUD puro.
 */

const STORAGE_KEY = "growth-os:signatures";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Signature[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Signature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Signature[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId(prefix: string) {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function sanitize(input: SignatureInput) {
  return {
    contract_id: input.contract_id,
    empresa_id: input.empresa_id,
    status: input.status,
    signer_name: input.signer_name.trim(),
    signer_email: input.signer_email.trim().toLowerCase(),
    signed_at: input.signed_at || undefined,
  };
}

export async function listSignatures(
  workspaceId: string,
  filters?: { contractId?: string; empresaId?: string },
): Promise<Signature[]> {
  return readAll()
    .filter((s) => s.workspace_id === workspaceId)
    .filter((s) =>
      filters?.contractId ? s.contract_id === filters.contractId : true,
    )
    .filter((s) =>
      filters?.empresaId ? s.empresa_id === filters.empresaId : true,
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getSignature(
  workspaceId: string,
  id: string,
): Promise<Signature | null> {
  return (
    readAll().find((s) => s.id === id && s.workspace_id === workspaceId) ?? null
  );
}

export async function createSignature(
  workspaceId: string,
  input: SignatureInput,
): Promise<Signature> {
  const now = new Date().toISOString();
  const data = sanitize(input);
  const signature: Signature = {
    id: generateId("sig"),
    workspace_id: workspaceId,
    ...data,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(signature);
  writeAll(list);
  return signature;
}

export async function updateSignatureStatus(
  workspaceId: string,
  id: string,
  status: SignatureStatus,
  opts?: { signedAt?: string },
): Promise<Signature> {
  const list = readAll();
  const idx = list.findIndex(
    (s) => s.id === id && s.workspace_id === workspaceId,
  );
  if (idx === -1) throw new Error("Assinatura não encontrada");
  const now = new Date().toISOString();
  const updated: Signature = {
    ...list[idx],
    status,
    signed_at:
      status === "assinado"
        ? (opts?.signedAt ?? list[idx].signed_at ?? now)
        : list[idx].signed_at,
    updated_at: now,
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function deleteSignature(
  workspaceId: string,
  id: string,
): Promise<void> {
  const list = readAll().filter(
    (s) => !(s.id === id && s.workspace_id === workspaceId),
  );
  writeAll(list);
}
