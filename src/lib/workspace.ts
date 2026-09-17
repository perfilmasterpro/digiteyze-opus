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
  // AuthProvider desmonta a área protegida ao marcar a sessão como encerrada.
  // Não notifique os consumidores filhos neste intervalo: eles seriam
  // renderizados uma última vez sem contexto antes de o AuthGate removê-los.
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

/**
 * Store para hooks de UI. Durante a hidratação/sign-out o contexto pode estar
 * ausente por alguns frames — nesse caso devolvemos um store vazio em vez de
 * lançar erro (que derrubava a árvore React e gerava tela branca).
 */
const EMPTY_STORE: WorkspaceStore = {
  workspaceId: "",
  userId: "",
  userName: "",
  role: "colaborador" as Role,
};

function useStoreOrEmpty(): WorkspaceStore {
  return useWorkspaceStore() ?? EMPTY_STORE;
}

export function getCurrentWorkspaceId(): string {
  return requireStore().workspaceId;
}

export function useCurrentWorkspaceId(): string {
  return useStoreOrEmpty().workspaceId;
}

export function getCurrentUserId(): string {
  return requireStore().userId;
}

export function useCurrentUserId(): string {
  return useStoreOrEmpty().userId;
}

export function getCurrentUserName(): string {
  return requireStore().userName;
}

export function getCurrentRole(): Role {
  return requireStore().role;
}
