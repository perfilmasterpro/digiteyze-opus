import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/prospeccao")({
  head: () => ({ meta: [{ title: "Prospecção — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Prospecção"
      icon={Target}
      summary="Jornada completa: primeiro contato → cliente → suporte → financeiro."
      planned={[
        "Pipeline visual (kanban)",
        "Etapas: contato, WhatsApp, ligação, reunião, proposta, negociação",
        "Conversão para cliente preservando histórico",
        "Funil com taxas de conversão",
      ]}
    />
  ),
});
