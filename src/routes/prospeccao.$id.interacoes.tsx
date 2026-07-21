import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import {
  InteractionForm,
  InteractionList,
  useLead,
  useLeadInteractions,
} from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/$id/interacoes")({
  component: LeadInteractionsRoute,
});

function LeadInteractionsRoute() {
  const { id } = Route.useParams();
  const { data: lead } = useLead(id);
  const { data, isLoading, isError, refetch } = useLeadInteractions(id);

  return (
    <div className="space-y-4">
      <InteractionForm leadId={id} lead={lead ?? undefined} />
      {isLoading ? (
        <LoadingState label="Carregando interações…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <InteractionList items={data ?? []} />
      )}
    </div>
  );
}

