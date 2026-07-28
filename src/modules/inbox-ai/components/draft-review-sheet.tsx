import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  TASK_CATEGORIA_LABEL,
  TASK_CATEGORIAS,
  TASK_PRIORIDADE_LABEL,
  TASK_PRIORIDADES,
  type TaskCategoria,
  type TaskPrioridade,
} from "@/modules/central/types/central.types";

import { useConvertDraft } from "../hooks/use-inbox";
import {
  INBOX_TIPO_LABEL,
  INBOX_TIPOS,
  type InboxItem,
  type InboxTipo,
} from "../types/inbox.types";

export function DraftReviewSheet({
  item,
  onClose,
}: {
  item: InboxItem | null;
  onClose: () => void;
}) {
  const convert = useConvertDraft();
  const [tipo, setTipo] = useState<InboxTipo>("tarefa");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<TaskCategoria>("administrativo");
  const [prioridade, setPrioridade] = useState<TaskPrioridade>("media");
  const [prazo, setPrazo] = useState("");
  const [projeto, setProjeto] = useState("");
  const [acoes, setAcoes] = useState("");

  useEffect(() => {
    if (!item) return;
    setTipo(item.tipo_confirmado ?? item.tipo_sugerido ?? "tarefa");
    setTitulo(item.titulo ?? item.conteudo_raw.slice(0, 80));
    setDescricao(item.descricao ?? item.conteudo_raw);
    setCategoria(item.categoria ?? "administrativo");
    setPrioridade(item.prioridade ?? "media");
    setPrazo(item.prazo_sugerido ?? "");
    setProjeto(item.projeto_sugerido ?? "");
    setAcoes(item.proximas_acoes.join("\n"));
  }, [item]);

  if (!item) return null;

  /** Guarda o que o usuário mudou em relação à sugestão da IA (aprendizado futuro). */
  function diffCorrecoes() {
    if (!item) return {};
    const diff: Record<string, unknown> = {};
    if (item.tipo_sugerido && item.tipo_sugerido !== tipo) diff.tipo = item.tipo_sugerido;
    if (item.categoria && item.categoria !== categoria) diff.categoria = item.categoria;
    if (item.prioridade && item.prioridade !== prioridade) diff.prioridade = item.prioridade;
    if ((item.titulo ?? "") !== titulo) diff.titulo = item.titulo;
    if ((item.prazo_sugerido ?? "") !== prazo) diff.prazo = item.prazo_sugerido;
    return diff;
  }

  async function handleConvert() {
    if (!item || !titulo.trim()) return;
    try {
      await convert.mutateAsync({
        item,
        input: {
          tipo,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          categoria,
          prioridade,
          prazo: prazo || null,
          projeto: projeto.trim() || null,
          proximas_acoes: acoes
            .split("\n")
            .map((a) => a.trim())
            .filter(Boolean),
          correcoes: diffCorrecoes(),
        },
      });
      toast.success(
        tipo === "nota" ? "Nota registrada" : `Convertido em ${INBOX_TIPO_LABEL[tipo]}`,
        { description: tipo === "nota" ? undefined : "Disponível na Central de Tarefas." },
      );
      onClose();
    } catch (error) {
      toast.error("Falha ao converter", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Revisar rascunho</SheetTitle>
          <SheetDescription>
            Ajuste a sugestão da IA antes de converter. Nada é criado sem sua confirmação.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">Captura original</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{item.conteudo_raw}</p>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as InboxTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INBOX_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {INBOX_TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inbox-titulo">Título</Label>
            <Input
              id="inbox-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inbox-descricao">Descrição</Label>
            <Textarea
              id="inbox-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) => setCategoria(v as TaskCategoria)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {TASK_CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={prioridade}
                onValueChange={(v) => setPrioridade(v as TaskPrioridade)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inbox-prazo">Prazo</Label>
              <Input
                id="inbox-prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inbox-projeto">Projeto</Label>
              <Input
                id="inbox-projeto"
                value={projeto}
                onChange={(e) => setProjeto(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inbox-acoes">Próximas ações (uma por linha)</Label>
            <Textarea
              id="inbox-acoes"
              value={acoes}
              onChange={(e) => setAcoes(e.target.value)}
              rows={4}
              placeholder="Viram itens de checklist da tarefa"
            />
          </div>

          <div className="flex gap-2 pb-6">
            <Button
              onClick={handleConvert}
              disabled={convert.isPending || !titulo.trim()}
              className="flex-1"
            >
              {convert.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {tipo === "nota" ? "Salvar nota" : `Converter em ${INBOX_TIPO_LABEL[tipo]}`}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
