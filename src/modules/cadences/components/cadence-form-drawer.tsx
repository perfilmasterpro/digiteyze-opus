import { useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useMessageCategories, useMessageTemplates } from "@/modules/message-templates";

import { useCadenceDetail, useCreateCadence, useUpdateCadence } from "../hooks/use-cadences";
import { cadenceSchema } from "../schemas/cadences.schema";
import {
  CADENCE_STATUS,
  CADENCE_STATUS_LABEL,
  CADENCE_STEP_TIPOS,
  CADENCE_STEP_TIPO_LABEL,
  type CadenceInput,
  type CadenceStepInput,
  type CadenceStatus,
  type CadenceStepTipo,
} from "../types/cadences.types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cadenceId?: string | null;
};

function emptyStep(ordem: number): CadenceStepInput {
  return {
    ordem,
    nome: "",
    categoria_id: null,
    template_id: null,
    tipo_acao: "mensagem",
    tempo_espera_dias: 1,
    descricao: null,
  };
}

export function CadenceFormDrawer({ open, onOpenChange, cadenceId }: Props) {
  const isEdit = Boolean(cadenceId);
  const detail = useCadenceDetail(cadenceId ?? undefined);
  const createMut = useCreateCadence();
  const updateMut = useUpdateCadence();
  const { data: categories = [] } = useMessageCategories();
  const { data: templates = [] } = useMessageTemplates();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<CadenceStatus>("ativa");
  const [steps, setSteps] = useState<CadenceStepInput[]>([emptyStep(1)]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && detail.data) {
      setNome(detail.data.nome);
      setDescricao(detail.data.descricao ?? "");
      setStatus((detail.data.status as CadenceStatus) ?? "ativa");
      setSteps(
        detail.data.steps.length
          ? detail.data.steps.map((s, i) => ({
              id: s.id,
              ordem: i + 1,
              nome: s.nome,
              categoria_id: s.categoria_id,
              template_id: s.template_id,
              tipo_acao: (s.tipo_acao as CadenceStepTipo) ?? "mensagem",
              tempo_espera_dias: s.tempo_espera_dias ?? 0,
              descricao: s.descricao ?? null,
            }))
          : [emptyStep(1)],
      );
    } else if (!isEdit) {
      setNome("");
      setDescricao("");
      setStatus("ativa");
      setSteps([emptyStep(1)]);
    }
  }, [open, isEdit, detail.data]);

  const templatesByCategoria = useMemo(() => {
    const map = new Map<string, typeof templates>();
    for (const t of templates) {
      const key = t.categoria as string;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [templates]);

  const updateStep = (i: number, patch: Partial<CadenceStepInput>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addStep = () => setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  const removeStep = (i: number) =>
    setSteps((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, ordem: idx + 1 })));
  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, idx) => ({ ...s, ordem: idx + 1 }));
    });

  async function handleSubmit() {
    const input: CadenceInput = {
      nome,
      descricao: descricao.trim() || null,
      status,
      steps: steps.map((s, i) => ({ ...s, ordem: i + 1 })),
    };
    const parsed = cadenceSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Verifique os campos");
      return;
    }
    try {
      if (isEdit && cadenceId) {
        await updateMut.mutateAsync({ id: cadenceId, input });
        toast.success("Cadência atualizada");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Cadência criada");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  }

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cadência" : "Nova cadência"}</SheetTitle>
          <SheetDescription>
            Configure uma sequência comercial reutilizável com etapas, categorias e templates.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Prospecção Hotéis" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CadenceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CADENCE_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CADENCE_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Para que serve esta cadência?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Etapas</h4>
              <Button type="button" size="sm" variant="outline" onClick={addStep}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Etapa
              </Button>
            </div>

            {steps.map((step, i) => {
              const cat = categories.find((c) => c.id === step.categoria_id);
              const availableTemplates = step.categoria_id
                ? (templatesByCategoria.get(cat?.slug ?? "") ?? []).filter((t) => t.ativo)
                : templates.filter((t) => t.ativo);
              return (
                <div key={i} className="rounded-md border bg-card p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">Etapa {i + 1}</Badge>
                    <div className="ml-auto flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStep(i, 1)}
                        disabled={i === steps.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeStep(i)}
                        disabled={steps.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Nome</Label>
                      <Input value={step.nome} onChange={(e) => updateStep(i, { nome: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de ação</Label>
                      <Select
                        value={step.tipo_acao}
                        onValueChange={(v) => updateStep(i, { tipo_acao: v as CadenceStepTipo })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CADENCE_STEP_TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>{CADENCE_STEP_TIPO_LABEL[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Categoria</Label>
                      <Select
                        value={step.categoria_id ?? "__none"}
                        onValueChange={(v) =>
                          updateStep(i, { categoria_id: v === "__none" ? null : v, template_id: null })
                        }
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— Nenhuma —</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />
                                {c.nome}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Template</Label>
                      <Select
                        value={step.template_id ?? "__none"}
                        onValueChange={(v) => updateStep(i, { template_id: v === "__none" ? null : v })}
                        disabled={step.tipo_acao === "espera"}
                      >
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— Nenhum —</SelectItem>
                          {availableTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tempo até próxima ação (dias)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={365}
                        value={step.tempo_espera_dias}
                        onChange={(e) => updateStep(i, { tempo_espera_dias: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Descrição / instruções</Label>
                      <Textarea
                        rows={2}
                        value={step.descricao ?? ""}
                        onChange={(e) => updateStep(i, { descricao: e.target.value || null })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar cadência"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
