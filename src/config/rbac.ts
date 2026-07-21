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
  "mensagens",
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

export type Permission =
  | `${ModuleKey}:${Action}`
  | `crm:proposal:${"view" | "create" | "update" | "approve"}`
  | `crm:contract:${"view" | "create" | "update" | "delete" | "send" | "sign"}`
  | `crm:signature:${"view" | "create" | "update" | "sign"}`
  | `growth:prospection:${"view" | "create" | "update" | "import" | "delete"}`;

/** Sub-ações do domínio CRM > Propostas. */
type ProposalAction = "view" | "create" | "update" | "approve";
const PROPOSAL_MATRIX: Record<Role, readonly ProposalAction[]> = {
  administrador: ["view", "create", "update", "approve"],
  gestor: ["view", "create", "update", "approve"],
  comercial: ["view", "create", "update"],
  operacional: ["view"],
  financeiro: ["view"],
  marketing: ["view"],
  desenvolvimento: ["view"],
  suporte: ["view"],
};

/** Sub-ações do domínio CRM > Contratos. */
type ContractAction = "view" | "create" | "update" | "delete" | "send" | "sign";
const CONTRACT_MATRIX: Record<Role, readonly ContractAction[]> = {
  administrador: ["view", "create", "update", "delete", "send", "sign"],
  gestor: ["view", "create", "update", "delete", "send", "sign"],
  comercial: ["view", "create", "update", "send"],
  operacional: ["view"],
  financeiro: ["view"],
  marketing: ["view"],
  desenvolvimento: ["view"],
  suporte: ["view"],
};

/** Sub-ações do domínio CRM > Assinaturas. */
type SignatureAction = "view" | "create" | "update" | "sign";
const SIGNATURE_MATRIX: Record<Role, readonly SignatureAction[]> = {
  administrador: ["view", "create", "update", "sign"],
  gestor: ["view", "create", "update", "sign"],
  comercial: ["view", "create", "update"],
  operacional: ["view"],
  financeiro: ["view"],
  marketing: ["view"],
  desenvolvimento: ["view"],
  suporte: ["view"],
};

/** Sub-ações do domínio Growth > Prospecção. */
type GrowthProspectionAction = "view" | "create" | "update" | "import" | "delete";
const GROWTH_PROSPECTION_MATRIX: Record<Role, readonly GrowthProspectionAction[]> = {
  administrador: ["view", "create", "update", "import", "delete"],
  gestor: ["view", "create", "update", "import", "delete"],
  comercial: ["view", "create", "update", "import"],
  operacional: ["view"],
  financeiro: ["view"],
  marketing: ["view"],
  desenvolvimento: ["view"],
  suporte: ["view"],
};

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
    "growth",
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
  // Sub-namespace: crm:proposal:<action>
  if (permission.startsWith("crm:proposal:")) {
    if (!canAccessModule(role, "crm")) return false;
    const action = permission.slice("crm:proposal:".length) as ProposalAction;
    return PROPOSAL_MATRIX[role]?.includes(action) ?? false;
  }
  if (permission.startsWith("crm:contract:")) {
    if (!canAccessModule(role, "crm")) return false;
    const action = permission.slice("crm:contract:".length) as ContractAction;
    return CONTRACT_MATRIX[role]?.includes(action) ?? false;
  }
  if (permission.startsWith("crm:signature:")) {
    if (!canAccessModule(role, "crm")) return false;
    const action = permission.slice("crm:signature:".length) as SignatureAction;
    return SIGNATURE_MATRIX[role]?.includes(action) ?? false;
  }
  if (permission.startsWith("growth:prospection:")) {
    if (!canAccessModule(role, "growth")) return false;
    const action = permission.slice("growth:prospection:".length) as GrowthProspectionAction;
    return GROWTH_PROSPECTION_MATRIX[role]?.includes(action) ?? false;
  }
  const [moduleKey, action] = permission.split(":") as [ModuleKey, Action];
  if (!canAccessModule(role, moduleKey)) return false;
  const override = ROLE_ACTION_OVERRIDES[role]?.[moduleKey];
  if (override) return override.includes(action);
  return true;
}
