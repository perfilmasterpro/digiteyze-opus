import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import { EmpresaFormDrawer } from "@/modules/empresas/empresa-form-drawer";
import { EmpresaHeader } from "@/modules/empresas/components/empresa-header";
import { EmpresaTabs } from "@/modules/empresas/components/empresa-tabs";
import { useArchiveEmpresa, useEmpresa, useReactivateEmpresa } from "@/modules/empresas/use-empresas";

export const Route = createFileRoute("/empresas/$id")({
  head: () => ({
    meta: [
      { title: "Empresa — Growth OS" },
      { name: "description", content: "Página 360° da empresa." },
    ],
  }),
  component: EmpresaLayout,
});

function EmpresaLayout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const role = useCurrentRole();
  const canUpdate = can(role, "empresas:update");
  const canArchive = can(role, "empresas:archive");

  const { data: empresa, isLoading, isError, refetch } = useEmpresa(id);
  const archive = useArchiveEmpresa();
  const reactivate = useReactivateEmpresa();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  if (isLoading) return <LoadingState label="Carregando empresa…" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!empresa) {
    return (
      <EmptyState
        title="Empresa não encontrada"
        description="O registro pode ter sido removido ou o link está incorreto."
        action={
          <Button size="sm" onClick={() => navigate({ to: "/empresas" })}>
            Voltar para Empresas
          </Button>
        }
      />
    );
  }

  const handleArchive = async () => {
    try {
      await archive.mutateAsync(empresa.id);
      toast.success("Empresa arquivada.");
      setArchiveOpen(false);
    } catch {
      toast.error("Não foi possível arquivar.");
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate.mutateAsync(empresa.id);
      toast.success("Empresa reativada.");
      setReactivateOpen(false);
    } catch {
      toast.error("Não foi possível reativar.");
    }
  };

  return (
    <div className="space-y-6">
      <EmpresaHeader
        empresa={empresa}
        canUpdate={canUpdate}
        canArchive={canArchive}
        onEdit={() => setDrawerOpen(true)}
        onArchive={() => setArchiveOpen(true)}
        onReactivate={() => setReactivateOpen(true)}
      />

      <EmpresaTabs empresaId={empresa.id} />

      <Outlet />

      <EmpresaFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        empresa={empresa}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arquivar empresa?"
        description={`A empresa "${empresa.nome}" será marcada como arquivada e sairá das listagens padrão.`}
        confirmLabel="Arquivar"
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title="Reativar empresa?"
        description={`A empresa "${empresa.nome}" voltará ao status "Ativo" e às listagens padrão.`}
        confirmLabel="Reativar"
        onConfirm={handleReactivate}
      />
    </div>
  );
}
