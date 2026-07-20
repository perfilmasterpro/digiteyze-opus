import type { Role } from "@/config/rbac";

/**
 * Placeholder do papel do usuário logado.
 * Retorna "administrador" enquanto a integração com auth/workspace não existe.
 * Todos os gates de UI devem consumir este hook.
 */
export function useCurrentRole(): Role {
  return "administrador";
}
