import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { OpportunityOverview, useOpportunity } from "@/modules/crm";

export const Route = createFileRoute("/crm/$id/")({
  component: OverviewTab,
});

function OverviewTab() {
  const { id } = Route.useParams();
  const { data } = useOpportunity(id);
  if (!data) return <ErrorState />;
  return <OpportunityOverview opportunity={data} />;
}
