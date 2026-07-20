import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas/$id/projetos")({
  component: () => (
    <ModulePlaceholder
      title="Projetos"
      icon={FolderKanban}
      summary="Projetos entregues e em andamento para esta empresa."
    />
  ),
});
