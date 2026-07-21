import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAiSuggestions } from "../hooks/use-central";

const URGENCIA_TONE: Record<string, string> = {
  urgente: "bg-destructive/10 text-destructive border-destructive/30",
  alta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  media: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
};

export function AiSuggestionsWidget() {
  const { data = [], isLoading } = useAiSuggestions();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          O que devo fazer agora?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem sugestões — você está em dia. ✨
          </p>
        ) : (
          data.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{s.titulo}</p>
                <Badge
                  variant="outline"
                  className={URGENCIA_TONE[s.urgencia] ?? URGENCIA_TONE.media}
                >
                  {s.urgencia}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.descricao}</p>
              {s.cta ? (
                <Button asChild size="sm" variant="outline" className="mt-2 h-7">
                  <Link to={s.cta.to}>{s.cta.label}</Link>
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
