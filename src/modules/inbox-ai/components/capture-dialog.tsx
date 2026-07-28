import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  TASK_PRIORIDADE_LABEL,
  TASK_PRIORIDADES,
  type TaskPrioridade,
} from "@/modules/central/types/central.types";

import { useCreateCapture } from "../hooks/use-inbox";
import {
  INBOX_TIPO_LABEL,
  INBOX_TIPOS,
  type InboxOrigem,
  type InboxTipo,
} from "../types/inbox.types";

/**
 * Captura rápida 100% manual (sem IA e sem custo).
 * Tudo entra na Inbox como rascunho; a conversão em tarefa é feita na revisão.
 */
export function CaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createCapture = useCreateCapture();

  const [tab, setTab] = useState<InboxOrigem>("texto");
  const [texto, setTexto] = useState("");
  const [colado, setColado] = useState("");
  const [origemDetalhe, setOrigemDetalhe] = useState("");
  const [tipo, setTipo] = useState<InboxTipo>("tarefa");
  const [prioridade, setPrioridade] = useState<TaskPrioridade>("media");

  useEffect(() => {
    if (!open) {
      setTexto("");
      setColado("");
      setOrigemDetalhe("");
      setTipo("tarefa");
      setPrioridade("media");
      setTab("texto");
    }
  }, [open]);

  const busy = createCapture.isPending;

  async function handleSubmit(origem: InboxOrigem, conteudo: string) {
    const valor = conteudo.trim();
    if (!valor) return;
    try {
      await createCapture.mutateAsync({
        origem,
        origem_detalhe: origemDetalhe.trim() || null,
        conteudo_raw: valor,
        tipo_sugerido: tipo,
        titulo: valor.split("\n")[0].slice(0, 80),
        prioridade,
      });
      toast.success("Capturado na Inbox", {
        description: "Revise quando quiser para converter em tarefa.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Falha ao capturar", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 text-primary" aria-hidden />
            Captura rápida
          </DialogTitle>
          <DialogDescription>
            Anote a ideia agora e organize depois. Nada vira tarefa sem a sua confirmação.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as InboxOrigem)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="texto" disabled={busy}>
              Texto
            </TabsTrigger>
            <TabsTrigger value="colado" disabled={busy}>
              Colar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="texto" className="space-y-3 pt-4">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: ligar para a Prosperar amanhã e enviar a proposta revisada"
              rows={6}
              disabled={busy}
              autoFocus
            />
          </TabsContent>

          <TabsContent value="colado" className="space-y-3 pt-4">
            <Input
              value={origemDetalhe}
              onChange={(e) => setOrigemDetalhe(e.target.value)}
              placeholder="Origem (ex.: WhatsApp do cliente, e-mail)"
              disabled={busy}
            />
            <Textarea
              value={colado}
              onChange={(e) => setColado(e.target.value)}
              placeholder="Cole aqui a conversa, e-mail ou anotação externa"
              rows={6}
              disabled={busy}
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3">
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

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Captura manual — sem IA e sem consumo de créditos.
          </p>
          <Button
            onClick={() =>
              handleSubmit(tab, tab === "texto" ? texto : colado)
            }
            disabled={busy || !(tab === "texto" ? texto.trim() : colado.trim())}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Salvar na Inbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
