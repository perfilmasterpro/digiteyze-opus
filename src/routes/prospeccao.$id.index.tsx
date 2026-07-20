import { createFileRoute } from "@tanstack/react-router";

import { LeadOverview, useLead } from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/$id/")({
  component: LeadOverviewRoute,
});

function LeadOverviewRoute() {
  const { id } = Route.useParams();
  const { data: lead } = useLead(id);
  if (!lead) return null;
  return <LeadOverview lead={lead} />;
}
