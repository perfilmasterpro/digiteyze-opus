import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { useTasks } from "../hooks/use-tasks";
import { groupTasksByProject } from "../services/central-aggregator";

export function ProjectsWidget() {
  const { data: tasks = [], isLoading } = useTasks();

  const items = useMemo(() => {
    const grouped = groupTasksByProject(tasks);
    return Array.from(grouped.entries())
      .map(([projeto, list]) => {
        const total = list.length;
        const em = list.filter((t) => t.status === "em_andamento").length;
        const homolog = list.filter((t) => t.status === "homologacao").length;
        return { projeto, total, em, homolog };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Rocket className="h-4 w-4 text-primary" />
          Projetos com pendências
        </CardTitle>
        <Link to="/tarefas" className="text-xs text-muted-foreground hover:underline">
          Ver Kanban
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum projeto com tarefas abertas.
          </p>
        ) : (
          items.map((p) => (
            <div key={p.projeto} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.projeto}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-normal">
                    {p.total} aberta{p.total > 1 ? "s" : ""}
                  </Badge>
                  {p.homolog > 0 ? (
                    <Badge variant="outline" className="font-normal">
                      {p.homolog} em homolog.
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Progress value={p.total === 0 ? 0 : (p.em / p.total) * 100} className="h-1.5" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
