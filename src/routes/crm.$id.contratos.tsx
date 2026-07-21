import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { ContractList, useOpportunity } from "@/modules/crm";

export const Route = createFileRoute("/crm/$id/contratos")({
  component: ContractsTab,
});

function ContractsTab() {
  const { id } = Route.useParams();
  const { data } = useOpportunity(id);
  if (!data) return <ErrorState />;
  return <ContractList opportunityId={data.id} empresaId={data.empresa_id} />;
}
