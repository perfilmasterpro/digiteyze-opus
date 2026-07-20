import { createFileRoute } from "@tanstack/react-router";
import { Rocket } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [{ title: "Projetos — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Projetos"
      icon={Rocket}
      planned={["Backlog", "Kanban", "Sprints", "Homologações", "Deploys"]}
    />
  ),
});
