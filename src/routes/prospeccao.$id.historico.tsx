import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { LeadEventsTimeline, useLeadEvents } from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/$id/historico")({
  component: LeadHistoricoRoute,
});

function LeadHistoricoRoute() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useLeadEvents(id);

  if (isLoading) return <LoadingState label="Carregando histórico…" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  return <LeadEventsTimeline events={data ?? []} />;
}
