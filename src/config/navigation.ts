import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Contact,
  FileStack,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  MessageSquareText,
  Megaphone,
  PenSquare,
  Rocket,
  Settings,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

import type { ModuleKey } from "./rbac";

export type NavItem = {
  key: ModuleKey;
  label: string;
  to: string;
  icon: LucideIcon;
  group: "operacao" | "comercial" | "producao" | "gestao" | "sistema";
  description?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: "central",
    label: "Minha Central",
    to: "/",
    icon: LayoutDashboard,
    group: "operacao",
    description: "Pendências e prioridades do dia",
  },
  {
    key: "central",
    label: "Tarefas",
    to: "/tarefas",
    icon: FileStack,
    group: "operacao",
    description: "Lista, kanban, agenda e calendário",
  },
  {
    key: "empresas",
    label: "Empresas",
    to: "/empresas",
    icon: Building2,
    group: "comercial",
  },
  {
    key: "crm",
    label: "CRM",
    to: "/crm",
    icon: Contact,
    group: "comercial",
  },
  {
    key: "prospeccao",
    label: "Prospecção",
    to: "/prospeccao",
    icon: Target,
    group: "comercial",
  },
  {
    key: "mensagens",
    label: "Biblioteca de Mensagens",
    to: "/mensagens",
    icon: MessageSquareText,
    group: "comercial",
    description: "Templates comerciais e favoritos",
  },
  {
    key: "marketing",
    label: "Marketing",
    to: "/marketing",
    icon: Megaphone,
    group: "producao",
  },
  {
    key: "conteudo",
    label: "Conteúdo",
    to: "/conteudo",
    icon: PenSquare,
    group: "producao",
  },
  {
    key: "projetos",
    label: "Projetos",
    to: "/projetos",
    icon: Rocket,
    group: "producao",
  },
  {
    key: "suporte",
    label: "Suporte",
    to: "/suporte",
    icon: Headphones,
    group: "gestao",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    to: "/financeiro",
    icon: Wallet,
    group: "gestao",
  },
  {
    key: "growth",
    label: "Growth",
    to: "/growth",
    icon: Sparkles,
    group: "gestao",
  },
  {
    key: "ia",
    label: "Inteligência Artificial",
    to: "/ia",
    icon: Sparkles,
    group: "producao",
  },
  {
    key: "base-conhecimento",
    label: "Base de Conhecimento",
    to: "/base-conhecimento",
    icon: GraduationCap,
    group: "sistema",
  },
  {
    key: "configuracoes",
    label: "Configurações",
    to: "/configuracoes",
    icon: Settings,
    group: "sistema",
  },
];

export const NAV_GROUP_LABELS: Record<NavItem["group"], string> = {
  operacao: "Operação",
  comercial: "Comercial",
  producao: "Produção",
  gestao: "Gestão",
  sistema: "Sistema",
};

// Silence unused-import warning until modules use FileStack elsewhere.
void FileStack;
