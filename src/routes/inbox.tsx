import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TASK_PRIORIDADE_LABEL } from "@/modules/central/types/central.types";

import { CaptureDialog } from "@/modules/inbox-ai/components/capture-dialog";
import { DraftReviewSheet } from "@/modules/inbox-ai/components/draft-review-sheet";
import {
  useDeleteInboxItem,
  useDiscardInboxItem,
  useInboxItems,
} from "@/modules/inbox-ai/hooks/use-inbox";
import {
  INBOX_ORIGEM_LABEL,
  INBOX_STATUS_LABEL,
  INBOX_TIPO_LABEL,
  inboxAgeInDays,
  type InboxItem,
} from "@/modules/inbox-ai/types/inbox.types";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
  head: () => ({
    meta: [
      { title: "Inbox — Growth OS" },
      {
        name: "description",
        content:
          "Capture ideias e tarefas por texto ou colagem e converta em tarefas da Central quando quiser.",
      },
      { property: "og:title", content: "Inbox — Growth OS" },
      {
        property: "og:description",
        content:
          "Captura rápida de ideias e tarefas por texto ou colagem no Growth OS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Filtro = "pendentes" | "aprovados" | "descartados" | "todos";

function InboxPage() {
  const { data, isLoading, isError, refetch } = useInboxItems();
  const discard = useDiscardInboxItem();
  const remove = useDeleteInboxItem();

  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [review, setReview] = useState<InboxItem | null>(null);

  const items = useMemo(() => {
    const all = data ?? [];
    if (filtro === "todos") return all;
    if (filtro === "aprovados") return all.filter((i) => i.status === "aprovado");
    if (filtro === "descartados") return all.filter((i) => i.status === "descartado");
    return all.filter((i) => !["aprovado", "descartado"].includes(i.status));
  }, [data, filtro]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Tudo que você captura vira um rascunho. Você decide o que vira trabalho."
        actions={
          <Button onClick={() => setCaptureOpen(true)}>
            <Zap className="size-4" aria-hidden />
            Nova captura
          </Button>
        }
      />

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovados">Convertidos</TabsTrigger>
          <TabsTrigger value="descartados">Descartados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" aria-hidden />}
          title="Nada por aqui"
          description="Capture uma ideia digitando ou colando um conteúdo externo."
          action={
            <Button onClick={() => setCaptureOpen(true)}>
              <Zap className="size-4" aria-hidden />
              Nova captura
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const dias = inboxAgeInDays(item);
            const pendente = !["aprovado", "descartado"].includes(item.status);
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{INBOX_ORIGEM_LABEL[item.origem]}</Badge>
                      <Badge variant="secondary">{INBOX_STATUS_LABEL[item.status]}</Badge>
                      {item.tipo_confirmado || item.tipo_sugerido ? (
                        <Badge>
                          {INBOX_TIPO_LABEL[item.tipo_confirmado ?? item.tipo_sugerido!]}
                        </Badge>
                      ) : null}
                      {item.prioridade ? (
                        <Badge variant="outline">
                          {TASK_PRIORIDADE_LABEL[item.prioridade]}
                        </Badge>
                      ) : null}
                      {pendente && dias >= 3 ? (
                        <Badge variant="destructive">Parado há {dias} dias</Badge>
                      ) : null}
                    </div>
                    <p className="truncate font-medium">
                      {item.titulo ?? item.conteudo_raw.slice(0, 80)}
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.descricao ?? item.conteudo_raw}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {pendente ? (
                      <>
                        <Button size="sm" onClick={() => setReview(item)}>
                          Revisar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Descartar rascunho"
                          onClick={() =>
                            discard
                              .mutateAsync(item.id)
                              .then(() => toast.success("Rascunho descartado"))
                          }
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Excluir item"
                        onClick={() =>
                          remove.mutateAsync(item.id).then(() => toast.success("Item excluído"))
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />
      <DraftReviewSheet item={review} onClose={() => setReview(null)} />
    </div>
  );
}
