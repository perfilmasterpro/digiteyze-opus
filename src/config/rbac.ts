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
export type Action =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "approve"
  | "export"
  | "move"
  | "convert";

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
  financeiro: ["central", "empresas", "crm", "financeiro", "base-conhecimento"],
  marketing: [
    "central",
    "empresas",
    "crm",
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
    "crm",
    "projetos",
    "ia",
    "base-conhecimento",
  ],
  suporte: ["central", "empresas", "crm", "suporte", "base-conhecimento"],
};


export function canAccessModule(role: Role, module: ModuleKey): boolean {
  const allowed = DEFAULT_ROLE_MODULES[role];
  if (allowed === "all") return true;
  return allowed.includes(module);
}

/**
 * Matriz de permissões por papel + ação.
 *
 * Estrutura preparada para futura migração a banco/RLS. Hoje deriva do acesso
 * ao módulo (papéis com acesso ao módulo podem executar todas as ações padrão),
 * exceto quando explicitamente restrito abaixo.
 */
const ROLE_ACTION_OVERRIDES: Partial<Record<Role, Partial<Record<ModuleKey, Action[]>>>> = {
  // Prospecção — ações sensíveis (move/convert/delete) exigem papel explícito.
  // CRM — administrador/gestor: tudo; comercial: view/create/update/move;
  // demais papéis: somente view.
  administrador: {
    prospeccao: ["view", "create", "update", "move", "convert", "delete", "archive", "export"],
    crm: ["view", "create", "update", "move", "delete", "archive", "export"],
  },
  gestor: {
    prospeccao: ["view", "create", "update", "move", "convert", "delete", "archive", "export"],
    crm: ["view", "create", "update", "move", "delete", "archive", "export"],
  },
  comercial: {
    prospeccao: ["view", "create", "update", "move", "convert"],
    crm: ["view", "create", "update", "move"],
  },
  operacional: { prospeccao: ["view"], crm: ["view"] },
  financeiro: { prospeccao: ["view"], crm: ["view"] },
  marketing: { prospeccao: ["view"], crm: ["view"] },
  desenvolvimento: { prospeccao: ["view"], crm: ["view"] },
  suporte: { prospeccao: ["view"], crm: ["view"] },
};


export function can(role: Role, permission: Permission): boolean {
  const [moduleKey, action] = permission.split(":") as [ModuleKey, Action];
  if (!canAccessModule(role, moduleKey)) return false;
  const override = ROLE_ACTION_OVERRIDES[role]?.[moduleKey];
  if (override) return override.includes(action);
  return true;
}
