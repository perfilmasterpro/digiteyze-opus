import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas/$id/contatos")({
  component: () => (
    <ModulePlaceholder
      title="Contatos"
      icon={Users}
      summary="Contatos vinculados à empresa serão gerenciados aqui."
    />
  ),
});
