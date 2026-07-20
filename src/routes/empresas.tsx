import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas — Growth OS" },
      { name: "description", content: "Cadastro central de empresas com visão 360°." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      title="Empresas"
      icon={Building2}
      summary="Cadastro único de empresas, base para CRM, Prospecção, Projetos, Financeiro e Suporte."
      planned={[
        "Cadastro e ficha 360° por empresa",
        "Contatos vinculados",
        "Timeline consolidada de interações",
        "Vínculo com propostas, contratos e projetos",
      ]}
    />
  ),
});
