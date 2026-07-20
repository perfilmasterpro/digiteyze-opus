import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas/$id/timeline")({
  component: () => (
    <ModulePlaceholder
      title="Timeline"
      icon={Activity}
      summary="Linha do tempo unificada com eventos de todos os módulos."
    />
  ),
});
