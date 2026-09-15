import type { Role } from "@/config/rbac";
import { useWorkspaceStore } from "@/lib/workspace";

/**
 * Papel do usuário logado no workspace ativo.
 * Retorna null durante a hidratação/encerramento da sessão para que gates de
 * permissão neguem acesso sem derrubar a árvore React.
 */
export function useCurrentRole(): Role | null {
  return useWorkspaceStore()?.role ?? null;
}
