/**
 * Workspace Context
 *
 * Centraliza a obtenção do workspace e usuário atual. Placeholder enquanto
 * auth/multi-tenant real não existe — toda leitura de contexto DEVE passar
 * por aqui.
 *
 * Quando o Lovable Cloud + auth entrarem, apenas a implementação abaixo muda;
 * consumidores permanecem intactos.
 */

const DEFAULT_WORKSPACE_ID = "default";
const DEFAULT_USER_ID = "user_local";
const DEFAULT_USER_NAME = "Você";

export function getCurrentWorkspaceId(): string {
  return DEFAULT_WORKSPACE_ID;
}

export function useCurrentWorkspaceId(): string {
  return getCurrentWorkspaceId();
}

export function getCurrentUserId(): string {
  return DEFAULT_USER_ID;
}

export function useCurrentUserId(): string {
  return getCurrentUserId();
}

export function getCurrentUserName(): string {
  return DEFAULT_USER_NAME;
}
