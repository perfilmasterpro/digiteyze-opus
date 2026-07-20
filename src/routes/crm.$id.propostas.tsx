import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { ProposalList, useOpportunity } from "@/modules/crm";

export const Route = createFileRoute("/crm/$id/propostas")({
  component: ProposalsTab,
});

function ProposalsTab() {
  const { id } = Route.useParams();
  const { data } = useOpportunity(id);
  if (!data) return <ErrorState />;
  return <ProposalList opportunityId={data.id} empresaId={data.empresa_id} />;
}
