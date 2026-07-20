import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useCreateLeadTask } from "../hooks/use-lead-tasks";

export function TaskForm({ leadId }: { leadId: string }) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
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
      });
      toast.success("Tarefa criada");
      setTitulo("");
      setData("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar tarefa");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
          <div className="space-y-1.5">
            <Label>Tarefa</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Enviar proposta"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
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
