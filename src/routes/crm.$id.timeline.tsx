import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { OpportunityTimeline, useOpportunity } from "@/modules/crm";

export const Route = createFileRoute("/crm/$id/timeline")({
  component: TimelineTab,
});

function TimelineTab() {
  const { id } = Route.useParams();
  const { data } = useOpportunity(id);
  if (!data) return <ErrorState />;
  return <OpportunityTimeline opportunity={data} />;
}
