import { Copy, Loader2, Send, Star, StarOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUserName } from "@/lib/workspace";
import type { Lead } from "@/modules/prospeccao";
import { useCreateLeadInteraction } from "@/modules/prospeccao/hooks/use-lead-interactions";

import {
  useActiveMessageCategories,
  useMessageCategoryMap,
} from "../hooks/use-message-categories";
import {
  useMessageTemplates,
  useMyFavoriteTemplates,
  useToggleFavoriteTemplate,
} from "../hooks/use-message-templates";
import { applyVariables } from "../services/apply-variables";
import {
  formatCategoriaLabel,
  type MessageTemplate,
} from "../types/message-templates.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  /** Canal usado quando o usuário marca "enviada" (default: whatsapp). */
  defaultChannel?: "whatsapp" | "email" | "ligacao" | "nota";
};

export function TemplatePickerDialog({
  open,
  onOpenChange,
  lead,
  defaultChannel = "whatsapp",
}: Props) {
  const { data: templates = [], isLoading } = useMessageTemplates();
  const { data: favIds = [] } = useMyFavoriteTemplates();
  const activeCategories = useActiveMessageCategories();
  const categoryMap = useMessageCategoryMap();
  const toggleFav = useToggleFavoriteTemplate();
  const createInteraction = useCreateLeadInteraction(lead.id);

  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderedText, setRenderedText] = useState("");

  const favSet = useMemo(() => new Set(favIds), [favIds]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return templates
      .filter((t) => t.ativo)
      .filter((t) => {
        if (categoria === "favoritos") return favSet.has(t.id);
        if (categoria !== "todas" && t.categoria !== categoria) return false;
        return true;
      })
      .filter((t) => {
        if (!term) return true;
        return (
          t.titulo.toLowerCase().includes(term) ||
          t.corpo.toLowerCase().includes(term)
        );
      });
  }, [templates, search, categoria, favSet]);

  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  function selectTemplate(t: MessageTemplate) {
    setSelectedId(t.id);
    const { text } = applyVariables(t.corpo, {
      lead,
      responsavelNome: getCurrentUserName(),
    });
    setRenderedText(text);
  }

  const missing = useMemo(() => {
    if (!selected) return [] as string[];
    return applyVariables(selected.corpo, {
      lead,
      responsavelNome: getCurrentUserName(),
    }).missing;
  }, [selected, lead]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(renderedText);
      toast.success("Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  async function markAsSent() {
    if (!selected) return;
    try {
      await createInteraction.mutateAsync({
        tipo: defaultChannel,
        data: new Date().toISOString(),
        descricao: `[Template: ${selected.titulo}]\n${renderedText.slice(0, 600)}`,
      });
      toast.success("Envio registrado no histórico");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar envio");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle>Enviar mensagem — {lead.nome_empresa}</DialogTitle>
          <DialogDescription>
            Escolha um template, revise a substituição de variáveis e registre o envio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr]">
          {/* Coluna esquerda: lista */}
          <div className="border-b md:border-b-0 md:border-r">
            <div className="space-y-2 border-b p-3">
              <Input
                placeholder="Buscar mensagens..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={categoria === "todas" ? "default" : "outline"}
                  onClick={() => setCategoria("todas")}
                  className="h-6 px-2 text-[11px]"
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant={categoria === "favoritos" ? "default" : "outline"}
                  onClick={() => setCategoria("favoritos")}
                  className="h-6 px-2 text-[11px]"
                >
                  ★ Favoritos
                </Button>
                {activeCategories.map((c) => {
                  const active = categoria === c.slug;
                  return (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setCategoria(c.slug)}
                      className="h-6 gap-1 px-2 text-[11px]"
                      style={
                        active
                          ? { backgroundColor: c.cor, borderColor: c.cor, color: "#fff" }
                          : { borderColor: `${c.cor}66`, color: c.cor }
                      }
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: active ? "#fff" : c.cor }}
                      />
                      {c.nome}
                    </Button>
                  );
                })}
              </div>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="divide-y">
                {isLoading && (
                  <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                  </div>
                )}
                {!isLoading && filtered.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma mensagem encontrada.
                  </p>
                )}
                {filtered.map((t) => {
                  const isFav = favSet.has(t.id);
                  const isActive = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTemplate(t)}
                      className={`flex w-full flex-col gap-1 p-3 text-left transition hover:bg-muted/60 ${
                        isActive ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-medium">{t.titulo}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFav.mutate({ templateId: t.id, favorite: !isFav });
                          }}
                          className="text-muted-foreground hover:text-warning"
                          aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                          {isFav ? (
                            <Star className="h-4 w-4 fill-current text-warning" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {MESSAGE_TEMPLATE_CATEGORIA_LABEL[t.categoria]}
                        </Badge>
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {t.corpo}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Coluna direita: preview */}
          <div className="flex flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Selecione uma mensagem para visualizar o preview.
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {MESSAGE_TEMPLATE_CATEGORIA_LABEL[selected.categoria]}
                  </p>
                  <h3 className="text-base font-semibold">{selected.titulo}</h3>
                </div>
                <Textarea
                  value={renderedText}
                  onChange={(e) => setRenderedText(e.target.value)}
                  rows={14}
                  className="flex-1 font-mono text-sm"
                />
                {missing.length > 0 && (
                  <p className="text-xs text-warning">
                    Variáveis sem valor no lead:{" "}
                    {missing.map((m) => (
                      <code key={m} className="mr-1 rounded bg-muted px-1">
                        {`{{${m}}}`}
                      </code>
                    ))}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="outline"
            onClick={copyToClipboard}
            disabled={!selected}
            className="gap-2"
          >
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button
            onClick={markAsSent}
            disabled={!selected || createInteraction.isPending}
            className="gap-2"
          >
            {createInteraction.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Copiar e registrar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
