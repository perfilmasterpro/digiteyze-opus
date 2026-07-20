import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmpresaOverview } from "@/modules/empresas/components/empresa-overview";
import { useEmpresa } from "@/modules/empresas/use-empresas";

export const Route = createFileRoute("/empresas/$id/")({
  component: OverviewTab,
});

function OverviewTab() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useEmpresa(id);
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;
  return <EmpresaOverview empresa={data} />;
}
