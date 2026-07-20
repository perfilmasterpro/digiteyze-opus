import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flag,
  Headphones,
  Inbox,
  ListChecks,
  MessageSquare,
  Target,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Central — Growth OS" },
      {
        name: "description",
        content:
          "Central operacional: pendências, homologações, leads aguardando contato, agenda e prioridades do dia.",
      },
    ],
  }),
  component: MinhaCentralPage,
});

const centralBlocks = [
  { key: "tarefas", title: "Tarefas pendentes", icon: ClipboardList, count: 0 },
  { key: "homologacoes", title: "Homologações", icon: CheckCircle2, count: 0 },
  { key: "leads", title: "Leads aguardando contato", icon: Target, count: 0 },
  { key: "chamados", title: "Chamados", icon: Headphones, count: 0 },
  { key: "conteudos", title: "Conteúdos", icon: MessageSquare, count: 0 },
  { key: "projetos", title: "Projetos com pendências", icon: ListChecks, count: 0 },
  { key: "financeiro", title: "Financeiro (7 dias)", icon: Flag, count: 0 },
  { key: "agenda", title: "Agenda de hoje", icon: CalendarClock, count: 0 },
] as const;

function MinhaCentralPage() {
  return (
    <div>
      <PageHeader
        title="Minha Central"
        icon={<Inbox className="h-5 w-5" />}
        description="Seu centro de operações — tudo que precisa da sua atenção em um só lugar."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Para agora" value="0" hint="Prioridade alta e sem bloqueios" icon={<Flag className="h-4 w-4" />} />
        <KpiCard label="Atrasados" value="0" hint="Prazo vencido" icon={<Clock className="h-4 w-4" />} />
        <KpiCard label="Aguardam meu retorno" value="0" hint="Retornos pendentes" icon={<MessageSquare className="h-4 w-4" />} />
        <KpiCard label="Homologações" value="0" hint="Para aprovar" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {centralBlocks.map(({ key, title, icon: Icon, count }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {title}
              </CardTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {count}
              </span>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="Nada pendente"
                description="Este bloco será preenchido quando o módulo estiver ativo."
                className="border-0 bg-transparent py-8"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
