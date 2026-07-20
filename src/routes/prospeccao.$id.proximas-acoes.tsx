import { createFileRoute } from "@tanstack/react-router";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { TaskForm, TaskList, useLeadTasks } from "@/modules/prospeccao";

export const Route = createFileRoute("/prospeccao/$id/proximas-acoes")({
  component: LeadTasksRoute,
});

function LeadTasksRoute() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useLeadTasks(id);

  return (
    <div className="space-y-4">
      <TaskForm leadId={id} />
      {isLoading ? (
        <LoadingState label="Carregando tarefas…" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <TaskList leadId={id} items={data ?? []} />
      )}
    </div>
  );
}
