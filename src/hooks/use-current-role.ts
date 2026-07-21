import type { Role } from "@/config/rbac";
import { getCurrentRole } from "@/lib/workspace";

/**
 * Papel do usuário logado no workspace ativo.
 * Backed pelo AuthProvider — lança se chamado sem sessão.
 */
export function useCurrentRole(): Role {
  return getCurrentRole();
}
