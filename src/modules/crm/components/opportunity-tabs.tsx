import { Link, useMatchRoute } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type TabDef = {
  label: string;
  to:
    | "/crm/$id"
    | "/crm/$id/propostas"
    | "/crm/$id/contratos"
    | "/crm/$id/timeline";
  exact?: boolean;
};

export function OpportunityTabs({ opportunityId }: { opportunityId: string }) {
  const matchRoute = useMatchRoute();
  const tabs: TabDef[] = [
    { label: "Visão Geral", to: "/crm/$id", exact: true },
    { label: "Propostas", to: "/crm/$id/propostas" },
    { label: "Contratos", to: "/crm/$id/contratos" },
    { label: "Timeline", to: "/crm/$id/timeline" },
  ];
  return (
    <div className="border-b" role="tablist" aria-label="Seções da oportunidade">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const params = { id: opportunityId };
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
