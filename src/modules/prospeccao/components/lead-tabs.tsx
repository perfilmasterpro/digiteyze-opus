import { Link, useMatchRoute } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type TabDef = {
  label: string;
  to:
    | "/prospeccao/$id"
    | "/prospeccao/$id/interacoes"
    | "/prospeccao/$id/historico"
    | "/prospeccao/$id/proximas-acoes"
    | "/prospeccao/$id/editar";
  exact?: boolean;
};

export function LeadTabs({ leadId }: { leadId: string }) {
  const matchRoute = useMatchRoute();

  const tabs: TabDef[] = [
    { label: "Visão Geral", to: "/prospeccao/$id", exact: true },
    { label: "Interações", to: "/prospeccao/$id/interacoes" },
    { label: "Histórico", to: "/prospeccao/$id/historico" },
    { label: "Próximas Ações", to: "/prospeccao/$id/proximas-acoes" },
    { label: "Editar", to: "/prospeccao/$id/editar" },
  ];


  return (
    <div className="border-b" role="tablist" aria-label="Seções do lead">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const params = { id: leadId };
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
