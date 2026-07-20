import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmpresaComercial } from "@/modules/empresas/components/empresa-comercial";
import { useEmpresa } from "@/modules/empresas/use-empresas";

export const Route = createFileRoute("/empresas/$id/comercial")({
  component: ComercialTab,
});

function ComercialTab() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useEmpresa(id);
  if (isLoading) return <LoadingState label="Carregando…" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  return <EmpresaComercial empresa={data} />;
}
