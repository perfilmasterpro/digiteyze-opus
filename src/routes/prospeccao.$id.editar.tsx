import { createFileRoute } from "@tanstack/react-router";

import { LeadEditForm, useLead } from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/$id/editar")({
  head: () => ({
    meta: [
      { title: "Editar lead — Growth OS" },
      { name: "description", content: "Edição completa dos dados do lead." },
    ],
  }),
  component: LeadEditRoute,
});

function LeadEditRoute() {
  const { id } = Route.useParams();
  const { data: lead } = useLead(id);
  if (!lead) return null;
  return <LeadEditForm lead={lead} />;
}
