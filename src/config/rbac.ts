/**
 * RBAC — Role-Based Access Control (Fase 0)
 *
 * Estruturas base. A verificação real acontecerá após integrar auth/DB.
 * Cada módulo consome estes tipos para gates de UI e (mais tarde) RLS.
 */

export const ROLES = [
  "administrador",
  "gestor",
  "operacional",
  "financeiro",
  "marketing",
  "comercial",
  "desenvolvimento",
  "suporte",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  operacional: "Operacional",
  financeiro: "Financeiro",
  marketing: "Marketing",
  comercial: "Comercial",
  desenvolvimento: "Desenvolvimento",
  suporte: "Suporte",
};

/** Módulos da plataforma — usados para navegação e permissões. */
export const MODULES = [
  "central",
  "empresas",
  "crm",
  "prospeccao",
  "marketing",
  "conteudo",
  "projetos",
  "suporte",
  "financeiro",
  "ia",
  "base-conhecimento",
  "growth",
  "configuracoes",
] as const;

export type ModuleKey = (typeof MODULES)[number];

/** Ações padrão suportadas por qualquer módulo. */
export type Action = "view" | "create" | "update" | "delete" | "approve" | "export";

export type Permission = `${ModuleKey}:${Action}`;

/**
 * Mapa padrão de módulos que cada papel enxerga.
 * Serve de default sensato; papéis reais podem sobrescrever no futuro.
 */
export const DEFAULT_ROLE_MODULES: Record<Role, ModuleKey[] | "all"> = {
  administrador: "all",
  gestor: "all",
  operacional: [
    "central",
    "empresas",
    "crm",
    "projetos",
    "suporte",
    "base-conhecimento",
  ],
  financeiro: ["central", "empresas", "financeiro", "base-conhecimento"],
  marketing: [
    "central",
    "empresas",
    "marketing",
    "conteudo",
    "ia",
    "base-conhecimento",
  ],
  comercial: [
    "central",
    "empresas",
    "crm",
    "prospeccao",
    "ia",
    "base-conhecimento",
  ],
  desenvolvimento: [
    "central",
    "projetos",
    "ia",
    "base-conhecimento",
  ],
  suporte: ["central", "empresas", "suporte", "base-conhecimento"],
};

export function canAccessModule(role: Role, module: ModuleKey): boolean {
  const allowed = DEFAULT_ROLE_MODULES[role];
  if (allowed === "all") return true;
  return allowed.includes(module);
}
