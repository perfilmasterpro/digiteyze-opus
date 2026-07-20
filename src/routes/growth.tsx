import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "Growth — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Growth"
      icon={Sparkles}
      summary="Metas e indicadores estratégicos da empresa."
      planned={[
        "Metas (faturamento, novos clientes, leads, conversões)",
        "Progresso vs. meta",
        "Fontes automáticas ligadas a outros módulos",
        "Ranking por responsável",
      ]}
    />
  ),
});
