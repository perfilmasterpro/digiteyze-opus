import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  OpportunityFormDrawer,
  OpportunityHeader,
  OpportunityTabs,
  useOpportunity,
} from "@/modules/crm";

export const Route = createFileRoute("/crm/$id")({
  head: () => ({
    meta: [
      { title: "Oportunidade — Growth OS" },
      { name: "description", content: "Ficha da oportunidade comercial." },
    ],
  }),
  component: OpportunityLayout,
});

function OpportunityLayout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const role = useCurrentRole();
  const canView = can(role, "crm:view");
  const canUpdate = can(role, "crm:update");

  const { data, isLoading, isError, refetch } = useOpportunity(id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <ErrorState title="Sem permissão" description="Você não tem acesso ao módulo CRM." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <LoadingState label="Carregando oportunidade…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
        <EmptyState
          title="Oportunidade não encontrada"
          description="O registro pode ter sido removido ou o link está incorreto."
          action={
            <Button size="sm" onClick={() => navigate({ to: "/crm" })}>
              Voltar para o CRM
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 md:px-6 md:py-8">
      <OpportunityHeader
        opportunity={data}
        canUpdate={canUpdate}
        onEdit={() => setDrawerOpen(true)}
      />
      <OpportunityTabs opportunityId={data.id} />
      <Outlet />
      <OpportunityFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        opportunity={data}
      />
    </div>
  );
}
