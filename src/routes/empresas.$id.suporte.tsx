import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas/$id/suporte")({
  component: () => (
    <ModulePlaceholder
      title="Suporte"
      icon={LifeBuoy}
      summary="Chamados e histórico de atendimento da empresa."
    />
  ),
});
