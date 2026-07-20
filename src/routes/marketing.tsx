import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Marketing"
      icon={Megaphone}
      planned={["Campanhas", "Leads", "Integrações Meta/Google Ads", "Relatórios"]}
    />
  ),
});
