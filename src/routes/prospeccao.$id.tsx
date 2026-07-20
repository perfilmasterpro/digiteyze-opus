import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  LeadConvertDialog,
  LeadDetailSkeleton,
  LeadFormDrawer,
  LeadHeader,
  LeadTabs,
  useConvertLead,
  useLead,
  useUpdateLeadStatus,
  type LeadStatus,
} from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/$id")({
  head: () => ({
    meta: [
      { title: "Lead — Growth OS" },
      { name: "description", content: "Ficha 360° do lead na prospecção." },
    ],
  }),
  component: LeadLayout,
});

function LeadLayout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const role = useCurrentRole();
  const canUpdate = can(role, "prospeccao:update");
  const canMove = can(role, "prospeccao:move");
  const canConvert = can(role, "prospeccao:convert");

  const { data: lead, isLoading, isError, refetch } = useLead(id);
  const updateStatus = useUpdateLeadStatus();
  const convert = useConvertLead();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  if (isLoading) return <LeadDetailSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!lead) {
    return (
      <EmptyState
        title="Lead não encontrado"
        description="O registro pode ter sido removido ou o link está incorreto."
        action={
          <Button size="sm" onClick={() => navigate({ to: "/prospeccao" })}>
            Voltar para Prospecção
          </Button>
        }
      />
    );
  }

  async function handleChangeStatus(status: LeadStatus) {
    try {
      await updateStatus.mutateAsync({ id: lead!.id, status });
      toast.success("Estágio atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar estágio");
    }
  }

  async function handleConvert() {
    try {
      const { empresa } = await convert.mutateAsync(lead!.id);
      toast.success(`Empresa "${empresa.nome}" criada`);
      setConvertOpen(false);
      navigate({ to: "/empresas/$id", params: { id: empresa.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível converter.");
    }
  }

  return (
    <div className="space-y-6">
      <LeadHeader
        lead={lead}
        canUpdate={canUpdate}
        canMove={canMove}
        canConvert={canConvert}
        onEdit={() => setDrawerOpen(true)}
        onChangeStatus={handleChangeStatus}
        onConvert={() => setConvertOpen(true)}
      />
      <LeadTabs leadId={lead.id} />
      <Outlet />

      <LeadFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} lead={lead} />
      <LeadConvertDialog
        lead={lead}
        open={convertOpen}
        onOpenChange={setConvertOpen}
        onConfirm={handleConvert}
        loading={convert.isPending}
      />
    </div>
  );
}
