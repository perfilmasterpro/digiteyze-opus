import { Link } from "@tanstack/react-router";
import { AlertTriangle, Phone, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useFollowUps } from "../hooks/use-central";

export function FollowUpsWidget() {
  const { data = [], isLoading } = useFollowUps();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-primary" />
          Follow-ups comerciais
        </CardTitle>
        <Link to="/prospeccao" className="text-xs text-muted-foreground hover:underline">
          Abrir Prospecção
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum lead aguardando retorno.
          </p>
        ) : (
          data.slice(0, 6).map((f) => (
            <Link
              key={f.leadId}
              to="/prospeccao/$id"
              params={{ id: f.leadId }}
              className={cn(
                "flex items-start justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50",
                f.vencida && "border-destructive/40 bg-destructive/5",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.empresaNome}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {f.proximaAcao ? <span className="truncate">{f.proximaAcao}</span> : null}
                  {f.data ? (
                    <span>{f.data.split("-").reverse().join("/")}</span>
                  ) : null}
                  {f.contato ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {f.contato}
                    </span>
                  ) : null}
                </div>
              </div>
              {f.vencida ? (
                <Badge variant="destructive" className="shrink-0">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Vencido
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  {f.status}
                </Badge>
              )}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
