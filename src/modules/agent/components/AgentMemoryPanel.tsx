/** Painel lateral: contexto operacional + memória de longo prazo do agente. */

import { Archive } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentContext, useAgentMemories, useArchiveMemory } from "../hooks/use-agent";
import { MEMORY_CATEGORIA_LABEL, type MemoryCategoria } from "../types/agent.types";

export function AgentMemoryPanel() {
  const { data: contexto } = useAgentContext();
  const { data: memorias } = useAgentMemories();
  const archive = useArchiveMemory();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Seu dia</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-semibold">{contexto?.hoje ?? 0}</p>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-destructive">
                {contexto?.atrasadas ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
            <div>
              <p className="text-xl font-semibold">{contexto?.pendentes ?? 0}</p>
              <p className="text-xs text-muted-foreground">Abertas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Projetos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(contexto?.projetos ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum projeto ativo.</p>
            )}
            {(contexto?.projetos ?? []).map((projeto) => (
              <div key={projeto.nome} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{projeto.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {projeto.abertas} abertas
                  {projeto.atrasadas > 0 ? ` · ${projeto.atrasadas} atrasadas` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Memória do agente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(memorias ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                O agente ainda não guardou nada. Peça para ele lembrar de algo.
              </p>
            )}
            {(memorias ?? []).map((memoria) => (
              <div key={memoria.id} className="space-y-1 rounded-md border p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="mb-1">
                      {MEMORY_CATEGORIA_LABEL[memoria.categoria as MemoryCategoria] ??
                        memoria.categoria}
                    </Badge>
                    <p className="truncate text-sm font-medium">{memoria.titulo}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Arquivar memória"
                    onClick={() => archive.mutate(memoria.id)}
                  >
                    <Archive className="text-muted-foreground" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{memoria.conteudo}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
