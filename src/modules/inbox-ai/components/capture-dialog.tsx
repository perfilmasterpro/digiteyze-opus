import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Sparkles } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";
import { classifyDraft, transcribeCapture } from "@/lib/inbox-ai.functions";

import { useCreateCapture } from "../hooks/use-inbox";
import { applySuggestion, markInboxError, uploadCaptureAudio } from "../services/inbox.service";
import { blobToBase64, startRecording, type Recorder } from "../services/wav-recorder";
import type { InboxOrigem, InboxSuggestion } from "../types/inbox.types";

type Step = "idle" | "gravando" | "transcrevendo" | "classificando";

export function CaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const createCapture = useCreateCapture();

  const [tab, setTab] = useState<InboxOrigem>("voz");
  const [texto, setTexto] = useState("");
  const [colado, setColado] = useState("");
  const [origemDetalhe, setOrigemDetalhe] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [segundos, setSegundos] = useState(0);
  const recorderRef = useRef<Recorder | null>(null);

  useEffect(() => {
    if (step !== "gravando") return;
    const id = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!open) {
      recorderRef.current?.cancel();
      recorderRef.current = null;
      setStep("idle");
      setSegundos(0);
      setTexto("");
      setColado("");
      setOrigemDetalhe("");
    }
  }, [open]);

  const busy = step === "transcrevendo" || step === "classificando";

  /** Cria o rascunho, classifica com IA e mantém o item pendente na Inbox. */
  async function processar(
    origem: InboxOrigem,
    conteudo: string,
    extra?: { audio_path?: string | null; duracao_seg?: number | null },
  ) {
    const item = await createCapture.mutateAsync({
      origem,
      origem_detalhe: origemDetalhe.trim() || null,
      conteudo_raw: conteudo,
      audio_path: extra?.audio_path ?? null,
      duracao_seg: extra?.duracao_seg ?? null,
    });

    setStep("classificando");
    try {
      const suggestion = (await classifyDraft({
        data: { workspaceId, texto: conteudo, inboxId: item.id },
      })) as unknown as InboxSuggestion;
      await applySuggestion(workspaceId, item.id, suggestion);
      toast.success("Rascunho criado", {
        description: "A IA sugeriu uma classificação. Revise na Inbox IA.",
      });
    } catch (error) {
      await markInboxError(workspaceId, item.id);
      toast.error("Não foi possível classificar", {
        description: describeError(error),
      });
    }
    onOpenChange(false);
  }

  async function handleStartRecording() {
    try {
      recorderRef.current = await startRecording();
      setSegundos(0);
      setStep("gravando");
    } catch {
      toast.error("Microfone indisponível", {
        description: "Autorize o acesso ao microfone para capturar por voz.",
      });
    }
  }

  async function handleStopRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setStep("transcrevendo");
    try {
      const { blob, duracaoSeg } = await recorder.stop();
      if (blob.size < 2048) {
        setStep("idle");
        toast.error("Gravação vazia", { description: "Grave novamente falando mais perto." });
        return;
      }
      const audioPath = await uploadCaptureAudio(userId, blob);
      const audioBase64 = await blobToBase64(blob);
      const { texto: transcrito } = (await transcribeCapture({
        data: { workspaceId, audioBase64, duracaoSeg },
      })) as unknown as { texto: string };

      if (!transcrito.trim()) {
        setStep("idle");
        toast.error("Não entendi o áudio", { description: "Tente gravar novamente." });
        return;
      }
      await processar("voz", transcrito, { audio_path: audioPath, duracao_seg: duracaoSeg });
    } catch (error) {
      setStep("idle");
      toast.error("Falha na captura por voz", { description: describeError(error) });
    }
  }

  async function handleSubmitTexto(origem: InboxOrigem, conteudo: string) {
    if (!conteudo.trim()) return;
    setStep("classificando");
    try {
      await processar(origem, conteudo.trim());
    } catch (error) {
      setStep("idle");
      toast.error("Falha ao criar rascunho", { description: describeError(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Captura rápida
          </DialogTitle>
          <DialogDescription>
            Tudo entra como rascunho na Inbox IA. Você decide depois o que vira tarefa,
            projeto, lembrete ou nota.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as InboxOrigem)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="voz" disabled={busy}>
              Voz
            </TabsTrigger>
            <TabsTrigger value="texto" disabled={busy || step === "gravando"}>
              Texto
            </TabsTrigger>
            <TabsTrigger value="colado" disabled={busy || step === "gravando"}>
              Colar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voz" className="pt-4">
            <div className="flex flex-col items-center gap-4 py-6">
              <button
                type="button"
                onClick={step === "gravando" ? handleStopRecording : handleStartRecording}
                disabled={busy}
                aria-label={step === "gravando" ? "Parar gravação" : "Iniciar gravação"}
                className={cn(
                  "flex size-20 items-center justify-center rounded-full transition",
                  step === "gravando"
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-primary text-primary-foreground hover:opacity-90",
                  busy && "opacity-60",
                )}
              >
                {busy ? (
                  <Loader2 className="size-7 animate-spin" aria-hidden />
                ) : step === "gravando" ? (
                  <Square className="size-7" aria-hidden />
                ) : (
                  <Mic className="size-7" aria-hidden />
                )}
              </button>
              <p className="text-sm text-muted-foreground">
                {step === "gravando"
                  ? `Gravando… ${formatDuration(segundos)}`
                  : step === "transcrevendo"
                    ? "Transcrevendo o áudio…"
                    : step === "classificando"
                      ? "A IA está organizando sua captura…"
                      : "Toque para gravar e fale livremente"}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="texto" className="space-y-3 pt-4">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: ligar para a Prosperar amanhã de manhã e enviar a proposta revisada"
              rows={6}
              disabled={busy}
            />
            <Button
              onClick={() => handleSubmitTexto("texto", texto)}
              disabled={busy || !texto.trim()}
              className="w-full"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Criar rascunho
            </Button>
          </TabsContent>

          <TabsContent value="colado" className="space-y-3 pt-4">
            <input
              value={origemDetalhe}
              onChange={(e) => setOrigemDetalhe(e.target.value)}
              placeholder="Origem (ex.: WhatsApp do cliente, e-mail)"
              disabled={busy}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <Textarea
              value={colado}
              onChange={(e) => setColado(e.target.value)}
              placeholder="Cole aqui a conversa, e-mail ou anotação externa"
              rows={6}
              disabled={busy}
            />
            <Button
              onClick={() => handleSubmitTexto("colado", colado)}
              disabled={busy || !colado.trim()}
              className="w-full"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Criar rascunho
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-start">
          <p className="text-xs text-muted-foreground">
            Nenhuma tarefa é criada automaticamente — a conversão é sempre sua.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429")) return "Limite de uso da IA atingido. Tente em instantes.";
  if (message.includes("402")) return "Créditos de IA esgotados no workspace.";
  return message.slice(0, 180);
}
