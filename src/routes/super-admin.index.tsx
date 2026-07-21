import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, Contact, FileStack, Handshake, Sparkles, Target, Users, Wallet } from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSuperAdminStats } from "@/modules/super-admin";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const fn = useServerFn(getSuperAdminStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "stats"],
    queryFn: () => fn(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Erro ao carregar KPIs: {(error as Error).message}</p>;
  }

  if (!data) return null;

  const items = [
    { label: "Workspaces", value: data.workspaces, icon: <Building2 className="h-4 w-4" /> },
    { label: "Usuários", value: data.users, icon: <Users className="h-4 w-4" /> },
    { label: "Empresas", value: data.empresas, icon: <Building2 className="h-4 w-4" /> },
    { label: "Leads", value: data.leads, icon: <Target className="h-4 w-4" /> },
    { label: "Oportunidades", value: data.opportunities, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Propostas", value: data.proposals, icon: <FileStack className="h-4 w-4" /> },
    { label: "Contratos", value: data.contracts, icon: <Contact className="h-4 w-4" /> },
    { label: "Assinaturas", value: data.signatures, icon: <Handshake className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((it) => (
        <KpiCard key={it.label} label={it.label} value={it.value} icon={it.icon} />
      ))}
      <div className="col-span-2 md:col-span-4 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <Wallet className="mr-1 inline h-3 w-3" /> Visão global — atualiza sempre que a página é aberta.
      </div>
    </div>
  );
}
