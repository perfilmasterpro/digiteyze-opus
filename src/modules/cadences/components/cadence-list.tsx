import { useState } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";

import { CadenceFormDrawer } from "./cadence-form-drawer";
import {
  useCadences,
  useDeleteCadence,
} from "../hooks/use-cadences";
import { useQueryClient } from "@tanstack/react-query";
import { seedProsperarCadence } from "../services/seed-template";
import { cadencesKeys } from "../hooks/use-cadences";
import { CADENCE_STATUS_LABEL, type CadenceStatus } from "../types/cadences.types";

export function CadenceList() {
  const { data: cadences = [], isLoading } = useCadences();
  const del = useDeleteCadence();
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedProsperarCadence(workspaceId, userId);
      qc.invalidateQueries({ queryKey: cadencesKeys.all(workspaceId) });
      toast.success("Cadência modelo criada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar modelo");
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir cadência "${nome}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Cadência excluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sequências reutilizáveis para guiar o atendimento dos leads.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {seeding ? "Criando..." : "Aplicar modelo Prosperar"}
          </Button>
          <Button size="sm" onClick={() => { setEditingId(null); setOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nova cadência
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando...</CardContent></Card>
      ) : cadences.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma cadência criada. Comece aplicando o modelo Prosperar ou crie uma nova.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cadences.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{c.nome}</h3>
                      <Badge variant={c.status === "ativa" ? "default" : "secondary"}>
                        {CADENCE_STATUS_LABEL[c.status as CadenceStatus] ?? c.status}
                      </Badge>
                    </div>
                    {c.descricao ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.descricao}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(c.id); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(c.id, c.nome)}
                      disabled={del.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CadenceFormDrawer open={open} onOpenChange={setOpen} cadenceId={editingId} />
    </div>
  );
}
