import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/suporte")({
  head: () => ({ meta: [{ title: "Suporte — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Suporte"
      icon={Headphones}
      planned={["Chamados", "SLA", "Base de conhecimento vinculada", "Satisfação"]}
    />
  ),
});
