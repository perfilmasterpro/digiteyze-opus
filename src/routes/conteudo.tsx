import { createFileRoute } from "@tanstack/react-router";
import { PenSquare } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/conteudo")({
  head: () => ({ meta: [{ title: "Conteúdo — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Conteúdo"
      icon={PenSquare}
      planned={["Calendário editorial", "Roteiros", "Aprovações", "Publicações"]}
    />
  ),
});
