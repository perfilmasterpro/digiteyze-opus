import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/ia")({
  head: () => ({ meta: [{ title: "Inteligência Artificial — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Inteligência Artificial"
      icon={Sparkles}
      planned={[
        "Biblioteca de prompts",
        "Categorias e favoritos",
        "Histórico de execuções",
        "Avaliações e versões",
      ]}
    />
  ),
});
