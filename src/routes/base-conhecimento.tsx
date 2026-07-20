import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

import { ModulePlaceholder } from "@/components/common/module-placeholder";

export const Route = createFileRoute("/base-conhecimento")({
  head: () => ({ meta: [{ title: "Base de Conhecimento — Growth OS" }] }),
  component: () => (
    <ModulePlaceholder
      title="Base de Conhecimento"
      icon={GraduationCap}
      planned={[
        "Espaços por área (Empresa, Comercial, Marketing, Dev, Processos, Tutoriais, Clientes)",
        "Páginas hierárquicas em markdown",
        "Versionamento e busca full-text",
        "Permissões por espaço",
      ]}
    />
  ),
});
