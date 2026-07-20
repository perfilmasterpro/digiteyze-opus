import { Link, useLocation } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type TabDef = {
  label: string;
  to: string;
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
  const pathname = useLocation({ select: (s) => s.pathname });
  const base = `/empresas/${empresaId}`;

  const tabs: TabDef[] = [
    { label: "Visão Geral", to: base, exact: true },
    { label: "Contatos", to: `${base}/contatos` },
    { label: "Timeline", to: `${base}/timeline` },
    { label: "Comercial", to: `${base}/comercial` },
    { label: "Projetos", to: `${base}/projetos` },
    { label: "Financeiro", to: `${base}/financeiro` },
    { label: "Suporte", to: `${base}/suporte` },
  ];

  return (
    <div className="border-b" role="tablist" aria-label="Seções da empresa">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              role="tab"
              aria-selected={active}
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
