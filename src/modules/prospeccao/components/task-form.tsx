import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateLeadTask } from "../hooks/use-lead-tasks";
import {
  LEAD_TASK_PRIORIDADES,
  LEAD_TASK_PRIORIDADE_LABEL,
  type LeadTaskPrioridade,
} from "../types/entities.types";

export function TaskForm({ leadId }: { leadId: string }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [prioridade, setPrioridade] = useState<LeadTaskPrioridade>("media");
  const create = useCreateLeadTask(leadId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    try {
      await create.mutateAsync({
        titulo: titulo.trim(),
        data: data || undefined,
        prioridade,
      });
      toast.success("Tarefa criada");
      setTitulo("");
      setData("");
      setPrioridade("media");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar tarefa");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form
          onSubmit={submit}
          className="grid gap-3 sm:grid-cols-[1fr_160px_140px_auto]"
        >
          <div className="space-y-1.5">
            <Label>Tarefa</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Enviar proposta"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as LeadTaskPrioridade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_TASK_PRIORIDADES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {LEAD_TASK_PRIORIDADE_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={create.isPending} className="gap-2">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
