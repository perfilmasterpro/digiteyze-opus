import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Financeiro"
      icon={Wallet}
      planned={[
        "Contas a pagar/receber",
        "Despesas recorrentes (domínios, VPS, APIs, SaaS)",
        "Fluxo de caixa",
        "Integração Mercado Pago",
      ]}
    />
  ),
});
