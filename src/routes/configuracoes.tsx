import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building,
  FileText,
  MessageSquareText,
  Palette,
  Plug,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLE_LABELS, ROLES } from "@/config/rbac";
import { CategoryManager } from "@/modules/message-templates";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [{ title: "Configurações — Growth OS" }],
  }),
  component: ConfiguracoesPage,
});

type Section = { value: string; label: string; icon: LucideIcon; content: ReactNode };

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children ?? (
          <EmptyState
            title="Configuração em preparação"
            description="A estrutura desta aba já está pronta. Os controles serão adicionados na próxima fase."
          />
        )}
      </CardContent>
    </Card>
  );
}

function ConfiguracoesPage() {
  const sections: Section[] = [
    {
      value: "empresa",
      label: "Empresa",
      icon: Building,
      content: <SectionShell title="Dados da empresa" description="Razão social, marca, contatos e preferências gerais." />,
    },
    {
      value: "usuarios",
      label: "Usuários",
      icon: Users,
      content: <SectionShell title="Usuários" description="Convite, edição e desativação de membros do workspace." />,
    },
    {
      value: "papeis",
      label: "Papéis",
      icon: UserCog,
      content: (
        <SectionShell
          title="Papéis"
          description="Papéis padrão da plataforma. Papéis customizados poderão ser criados futuramente."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <li
                key={r}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="font-medium">{ROLE_LABELS[r]}</span>
                <span className="text-xs text-muted-foreground">padrão</span>
              </li>
            ))}
          </ul>
        </SectionShell>
      ),
    },
    {
      value: "permissoes",
      label: "Permissões",
      icon: ShieldCheck,
      content: <SectionShell title="Permissões" description="Matriz de acesso por módulo × papel." />,
    },
    {
      value: "mensagens",
      label: "Mensagens",
      icon: MessageSquareText,
      content: (
        <SectionShell
          title="Categorias de mensagens"
          description="Nome, cor, status e ordem de exibição. As cores são compartilhadas com a Biblioteca de Mensagens, o Kanban de Leads e as Cadências comerciais."
        >
          <CategoryManager />
        </SectionShell>
      ),
    },
    {
      value: "integracoes",
      label: "Integrações",
      icon: Plug,
      content: (
        <SectionShell
          title="Integrações"
          description="WhatsApp, OpenAI, Meta, Google, Mercado Pago, N8N, Make e APIs próprias."
        />
      ),
    },
    {
      value: "notificacoes",
      label: "Notificações",
      icon: Bell,
      content: <SectionShell title="Notificações" description="Canais e preferências de envio." />,
    },
    {
      value: "logs",
      label: "Logs",
      icon: FileText,
      content: <SectionShell title="Logs de auditoria" description="Histórico de ações relevantes no sistema." />,
    },
    {
      value: "aparencia",
      label: "Aparência",
      icon: Palette,
      content: <SectionShell title="Aparência" description="Tema, densidade e preferências visuais." />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Configurações"
        icon={<SettingsIcon className="h-5 w-5" />}
        description="Gerencie empresa, usuários, papéis, integrações e preferências da plataforma."
      />

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <TabsTrigger key={s.value} value={s.value} className="gap-2">
                <Icon className="h-4 w-4" />
                <span>{s.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {sections.map((s) => (
          <TabsContent key={s.value} value={s.value} className="mt-0">
            {s.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
