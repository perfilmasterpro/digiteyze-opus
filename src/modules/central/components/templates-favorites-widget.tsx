import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, MessageSquareText, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";
import { useQuery } from "@tanstack/react-query";

type FavRow = { template_id: string };
type TemplateRow = {
  id: string;
  data: { titulo?: string; corpo?: string; categoria?: string } | null;
};

export function TemplatesFavoritesWidget() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();

  const { data, isLoading } = useQuery({
    queryKey: ["central-templates-favorites", workspaceId, userId],
    queryFn: async () => {
      const { data: favs } = await supabase
        .from("message_template_favorites")
        .select("template_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .limit(10);
      const ids = (favs ?? []).map((f: FavRow) => f.template_id);
      if (ids.length === 0) return [] as TemplateRow[];
      const { data: templates } = await supabase
        .from("message_templates")
        .select("id, data")
        .in("id", ids);
      return (templates ?? []) as TemplateRow[];
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => (data ?? []).slice(0, 5), [data]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Star className="h-4 w-4 text-primary" />
          Templates favoritos
        </CardTitle>
        <Link to="/mensagens" className="text-xs text-muted-foreground hover:underline">
          Ver biblioteca
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Marque templates como favoritos para acessá-los daqui.
          </p>
        ) : (
          items.map((t) => {
            const titulo = t.data?.titulo ?? "Sem título";
            const corpo = t.data?.corpo ?? "";
            return (
              <div
                key={t.id}
                className="flex items-start justify-between gap-2 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{titulo}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    <MessageSquareText className="mr-1 inline h-3 w-3" />
                    {corpo.slice(0, 100)}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copy(corpo)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
