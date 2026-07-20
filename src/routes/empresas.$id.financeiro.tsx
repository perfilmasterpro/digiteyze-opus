import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas/$id/financeiro")({
  component: () => (
    <ModulePlaceholder
      title="Financeiro"
      icon={DollarSign}
      summary="Faturas, recebimentos e inadimplências desta empresa."
    />
  ),
});
