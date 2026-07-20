import { createFileRoute } from "@tanstack/react-router";
import { Handshake } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas/$id/comercial")({
  component: () => (
    <ModulePlaceholder
      title="Comercial"
      icon={Handshake}
      summary="Oportunidades, propostas e contratos vinculados à empresa."
    />
  ),
});
