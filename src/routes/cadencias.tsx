import { createFileRoute } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { CadenceList } from "@/modules/cadences";

export const Route = createFileRoute("/cadencias")({
  head: () => ({ meta: [{ title: "Cadências — Growth OS" }] }),
  component: CadenciasPage,
});

function CadenciasPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Cadências Comerciais"
        icon={<RouteIcon className="h-5 w-5" />}
        description="Sequências reutilizáveis que guiam o atendimento dos leads, integradas à biblioteca de mensagens e ao módulo de tarefas."
      />
      <CadenceList />
    </div>
  );
}
