import { Link, useMatchRoute } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type TabDef = {
  label: string;
  to: "/empresas/$id" | "/empresas/$id/contatos" | "/empresas/$id/timeline" | "/empresas/$id/comercial" | "/empresas/$id/projetos" | "/empresas/$id/financeiro" | "/empresas/$id/suporte";
  exact?: boolean;
};

/**
 * Navegação por abas da página 360°.
 *
 * Usa rotas aninhadas (`/empresas/$id/*`) para que cada aba seja um leaf
 * independente. "Visão Geral" é a única aba funcional no Sprint 2.1; as
 * demais renderizam `ModulePlaceholder`.
 */
export function EmpresaTabs({ empresaId }: { empresaId: string }) {
  const matchRoute = useMatchRoute();

  const tabs: TabDef[] = [
    { label: "Visão Geral", to: "/empresas/$id", exact: true },
    { label: "Contatos", to: "/empresas/$id/contatos" },
    { label: "Timeline", to: "/empresas/$id/timeline" },
    { label: "Comercial", to: "/empresas/$id/comercial" },
    { label: "Projetos", to: "/empresas/$id/projetos" },
    { label: "Financeiro", to: "/empresas/$id/financeiro" },
    { label: "Suporte", to: "/empresas/$id/suporte" },
  ];

  return (
    <div className="border-b" role="tablist" aria-label="Seções da empresa">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const params = { id: empresaId };
          const matched = matchRoute({ to: t.to, params });
          const active = !!matched;

          return (
            <Link
              key={t.to}
              to={t.to}
              params={params}
              role="tab"
              aria-selected={active ? "true" : "false"}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
