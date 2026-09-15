/**
 * Workspace Context
 *
 * Fornece contexto do workspace/usuário atual a partir da sessão real
 * (populada pelo AuthProvider). Mantém API síncrona para não quebrar os
 * services existentes enquanto a migração para Supabase não é concluída.
 */

import { useSyncExternalStore } from "react";

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

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): WorkspaceStore | null {
  return currentStore;
}

function getServerSnapshot(): WorkspaceStore | null {
  return null;
}

/** Store reativo (pode ser null enquanto a sessão carrega). */
export function useWorkspaceStore(): WorkspaceStore | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useRequireStore(): WorkspaceStore {
  const store = useWorkspaceStore();
  if (!store) {
    throw new Error(
      "Workspace context indisponível: usuário não autenticado ou sessão ainda carregando.",
    );
  }
  return store;
}

export function getCurrentWorkspaceId(): string {
  return requireStore().workspaceId;
}

export function useCurrentWorkspaceId(): string {
  return useRequireStore().workspaceId;
}

export function getCurrentUserId(): string {
  return requireStore().userId;
}

export function useCurrentUserId(): string {
  return useRequireStore().userId;
}

export function getCurrentUserName(): string {
  return requireStore().userName;
}

export function getCurrentRole(): Role {
  return requireStore().role;
}
