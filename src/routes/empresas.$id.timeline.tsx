import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmpresaTimeline, useEmpresaEvents } from "@/modules/empresas";

export const Route = createFileRoute("/empresas/$id/timeline")({
  component: EmpresaTimelineRoute,
});

function EmpresaTimelineRoute() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useEmpresaEvents(id);

  if (isLoading) return <LoadingState label="Carregando timeline…" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <EmpresaTimeline events={data ?? []} />;
}
