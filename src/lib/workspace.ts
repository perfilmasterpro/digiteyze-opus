/**
 * Workspace Context
 *
 * Centraliza a obtenção do workspace atual. Placeholder enquanto auth/multi-tenant
 * real não existe — toda leitura de workspace na aplicação DEVE passar por aqui.
 *
 * Quando o Lovable Cloud + auth entrarem, apenas a implementação abaixo muda;
 * consumidores permanecem intactos.
 */

const DEFAULT_WORKSPACE_ID = "default";

export function getCurrentWorkspaceId(): string {
  return DEFAULT_WORKSPACE_ID;
}

export function useCurrentWorkspaceId(): string {
  return getCurrentWorkspaceId();
}
