import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

import { AgendaWidget } from "@/modules/central/components/agenda-widget";
import { AiSuggestionsWidget } from "@/modules/central/components/ai-suggestions-widget";
import { FollowUpsWidget } from "@/modules/central/components/followups-widget";
import { HojeWidget } from "@/modules/central/components/hoje-widget";
import { IndicatorsGrid } from "@/modules/central/components/indicators-grid";
import { ProjectsWidget } from "@/modules/central/components/projects-widget";
import { TaskFormDrawer } from "@/modules/central/components/task-form-drawer";
import { TemplatesFavoritesWidget } from "@/modules/central/components/templates-favorites-widget";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minha Central — Growth OS" },
      {
        name: "description",
        content:
          "Central operacional inteligente: tarefas do dia, follow-ups, agenda, projetos e sugestões prioritárias.",
      },
      { property: "og:title", content: "Minha Central — Growth OS" },
      {
        property: "og:description",
        content: "Painel diário do Growth OS: comece o dia com clareza.",
      },
    ],
  }),
  component: MinhaCentralPage,
});

function MinhaCentralPage() {
  const [openNew, setOpenNew] = useState(false);
  return (
    <div>
      <PageHeader
        title="Minha Central"
        icon={<Inbox className="h-5 w-5" />}
        description="Seu centro de operações — tudo que precisa da sua atenção em um só lugar."
        actions={
          <Button size="sm" onClick={() => setOpenNew(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />

      <IndicatorsGrid />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <HojeWidget />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FollowUpsWidget />
            <AgendaWidget />
          </div>
          <ProjectsWidget />
        </div>
        <div className="space-y-4">
          <AiSuggestionsWidget />
          <TemplatesFavoritesWidget />
        </div>
      </div>

      <TaskFormDrawer open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}
