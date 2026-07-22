import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareText, Pencil, Plus, Star, StarOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  TemplateFormDrawer,
  useActiveMessageCategories,
  useDeleteTemplate,
  useMessageCategoryMap,
  useMessageTemplates,
  useMyFavoriteTemplates,
  useSetTemplateActive,
  useToggleFavoriteTemplate,
  formatCategoriaLabel,
  type MessageTemplate,
} from "@/modules/message-templates";

export const Route = createFileRoute("/mensagens")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Mensagens — Growth OS" },
      {
        name: "description",
        content:
          "Templates comerciais compartilhados no workspace, com favoritos pessoais e substituição de variáveis.",
      },
      { property: "og:title", content: "Biblioteca de Mensagens — Growth OS" },
      {
        property: "og:description",
        content: "Modelos de mensagens comerciais com variáveis dinâmicas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MensagensPage,
});

function MensagensPage() {
  const role = useCurrentRole();
  const canView = can(role, "mensagens:view");
  const canCreate = can(role, "mensagens:create");
  const canUpdate = can(role, "mensagens:update");
  const canDelete = can(role, "mensagens:delete");

  const { data = [], isLoading, isError, refetch } = useMessageTemplates();
  const { data: favIds = [] } = useMyFavoriteTemplates();
  const activeCategories = useActiveMessageCategories();
  const categoryMap = useMessageCategoryMap();
  const toggleFav = useToggleFavoriteTemplate();
  const setActive = useSetTemplateActive();
  const del = useDeleteTemplate();

  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [deleting, setDeleting] = useState<MessageTemplate | null>(null);

  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data
      .filter((t) => {
        if (categoriaFilter === "favoritos") return favSet.has(t.id);
        if (categoriaFilter !== "todas" && t.categoria !== categoriaFilter) return false;
        return true;
      })
      .filter((t) => {
        if (!term) return true;
        return (
          t.titulo.toLowerCase().includes(term) ||
          t.corpo.toLowerCase().includes(term)
        );
      });
  }, [data, search, categoriaFilter, favSet]);

  if (!canView) {
    return (
      <EmptyState
        title="Sem acesso"
        description="Seu papel não tem permissão para acessar a Biblioteca de Mensagens."
      />
    );
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(t: MessageTemplate) {
    setEditing(t);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success("Mensagem removida");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de Mensagens"
        description="Modelos comerciais compartilhados no workspace, com variáveis dinâmicas e favoritos pessoais."
        icon={<MessageSquareText className="h-6 w-6" />}
        actions={
          canCreate ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Nova mensagem
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou conteúdo..."
          className="sm:flex-1"
        />
        <Select
          value={categoriaFilter}
          onValueChange={(v) => setCategoriaFilter(v)}
        >
          <SelectTrigger className="sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            <SelectItem value="favoritos">★ Favoritos</SelectItem>
            {activeCategories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  {c.nome}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          title="Nenhuma mensagem encontrada"
          description={
            canCreate
              ? "Comece criando o primeiro template comercial do workspace."
              : "Solicite ao seu gestor a criação dos primeiros templates."
          }
          action={
            canCreate ? (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Nova mensagem
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t) => {
          const isFav = favSet.has(t.id);
          return (
            <Card key={t.id} className={t.ativo ? "" : "opacity-60"}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="line-clamp-1 text-sm font-semibold">{t.titulo}</h3>
                      {!t.ativo && (
                        <Badge variant="outline" className="text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {(() => {
                      const cat = categoryMap.get(t.categoria);
                      const color = cat?.cor;
                      return (
                        <Badge
                          variant="secondary"
                          className="mt-1 gap-1 text-[10px]"
                          style={
                            color
                              ? {
                                  backgroundColor: `${color}22`,
                                  color,
                                  borderColor: `${color}55`,
                                }
                              : undefined
                          }
                        >
                          {color && (
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          )}
                          {cat?.nome ?? formatCategoriaLabel(t.categoria)}
                        </Badge>
                      );
                    })()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      toggleFav.mutate({ templateId: t.id, favorite: !isFav })
                    }
                    aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    {isFav ? (
                      <Star className="h-4 w-4 fill-current text-warning" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="line-clamp-5 flex-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {t.corpo}
                </p>

                {t.variaveis.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.variaveis.slice(0, 4).map((v) => (
                      <code
                        key={v}
                        className="rounded bg-muted px-1 py-0.5 text-[10px] text-foreground"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                    {t.variaveis.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{t.variaveis.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={t.ativo}
                      onCheckedChange={(v) =>
                        canUpdate &&
                        setActive.mutate({ id: t.id, ativo: v })
                      }
                      disabled={!canUpdate}
                    />
                    Ativo
                  </label>
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(t)}
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TemplateFormDrawer
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setEditing(null);
        }}
        template={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. A mensagem "{deleting?.titulo}" será excluída do workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
