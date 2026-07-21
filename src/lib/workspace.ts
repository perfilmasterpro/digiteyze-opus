/**
 * Workspace Context
 *
 * Fornece contexto do workspace/usuário atual a partir da sessão real
 * (populada pelo AuthProvider). Mantém API síncrona para não quebrar os
 * services existentes enquanto a migração para Supabase não é concluída.
 */

import type { Role } from "@/config/rbac";

type WorkspaceStore = {
  workspaceId: string;
  userId: string;
  userName: string;
  role: Role;
};

let currentStore: WorkspaceStore | null = null;
const listeners = new Set<() => void>();

/** @internal — usado apenas pelo AuthProvider. */
export function __setWorkspaceStore(next: WorkspaceStore): void {
  currentStore = next;
  listeners.forEach((l) => l());
}

/** @internal — usado apenas pelo AuthProvider. */
export function __clearWorkspaceStore(): void {
  currentStore = null;
  listeners.forEach((l) => l());
}

function requireStore(): WorkspaceStore {
  if (!currentStore) {
    throw new Error(
      "Workspace context indisponível: usuário não autenticado ou sessão ainda carregando.",
    );
  }
  return currentStore;
}

export function getCurrentWorkspaceId(): string {
  return requireStore().workspaceId;
}

export function useCurrentWorkspaceId(): string {
  return getCurrentWorkspaceId();
}

export function getCurrentUserId(): string {
  return requireStore().userId;
}

export function useCurrentUserId(): string {
  return getCurrentUserId();
}

export function getCurrentUserName(): string {
  return requireStore().userName;
}

export function getCurrentRole(): Role {
  return requireStore().role;
}
