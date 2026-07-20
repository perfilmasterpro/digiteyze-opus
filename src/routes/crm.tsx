import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/crm")({
  head: () => ({
    meta: [{ title: "CRM — Growth OS" }],
  }),
  component: () => (
    <ModulePlaceholder
      title="CRM"
      icon={Contact}
      summary="Visão 360° do cliente: dados, contatos, propostas, contratos, reuniões e histórico."
      planned={[
        "Página única por empresa",
        "Propostas, contratos e reuniões",
        "Timeline unificada",
        "Ligação com Suporte, Projetos e Financeiro",
      ]}
    />
  ),
});
