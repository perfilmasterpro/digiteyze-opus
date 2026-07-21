import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdminLogs } from "@/modules/super-admin";

export const Route = createFileRoute("/super-admin/logs")({
  component: LogsPage,
});

function severityVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "warning") return "secondary";
  if (s === "error" || s === "critical") return "destructive";
  return "default";
}

function LogsPage() {
  const fn = useServerFn(listAdminLogs);
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "logs"],
    queryFn: () => fn({ data: { limit: 200 } }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-2">
      {(data ?? []).map((log) => (
        <div key={log.id} className="rounded-md border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={severityVariant(log.severity)}>{log.severity}</Badge>
              <span className="font-mono text-xs">{log.event_type}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(log.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          {log.message && <p className="mt-1 text-sm">{log.message}</p>}
          {log.metadata && Object.keys(log.metadata as object).length > 0 && (
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-[10px] text-muted-foreground">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      ))}
      {data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
      )}
    </div>
  );
}
