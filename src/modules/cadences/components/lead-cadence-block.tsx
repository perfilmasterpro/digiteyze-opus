import { useMemo, useState } from "react";
import { ChevronRight, CircleCheck, Pause, Play, Route, Square } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useCadences, useCadenceSteps } from "../hooks/use-cadences";
import {
  useActiveLeadCadence,
  useAdvanceLeadCadence,
  useFinishLeadCadence,
  usePauseLeadCadence,
  useResumeLeadCadence,
  useStartLeadCadence,
} from "../hooks/use-lead-cadences";
import { LEAD_CADENCE_STATUS_LABEL, type LeadCadenceStatus } from "../types/cadences.types";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export function LeadCadenceBlock({ leadId }: { leadId: string }) {
  const { data: active } = useActiveLeadCadence(leadId);
  const { data: cadences = [] } = useCadences();
  const { data: steps = [] } = useCadenceSteps(active?.cadence_id ?? undefined);

  const [selected, setSelected] = useState<string>("");
  const start = useStartLeadCadence(leadId);
  const advance = useAdvanceLeadCadence(leadId);
  const pause = usePauseLeadCadence(leadId);
  const resume = useResumeLeadCadence(leadId);
  const finish = useFinishLeadCadence(leadId);

  const activeCadence = useMemo(
    () => cadences.find((c) => c.id === active?.cadence_id),
    [cadences, active],
  );

  const currentStep = steps.find((s) => s.ordem === active?.etapa_atual);
  const totalSteps = steps.length;
  const status = (active?.status as LeadCadenceStatus) ?? "ativa";

  async function handleStart() {
    if (!selected) return toast.error("Selecione uma cadência");
    try {
      await start.mutateAsync(selected);
      toast.success("Cadência iniciada");
      setSelected("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar");
    }
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="h-4 w-4" /> Cadência atual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!active ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Nenhuma cadência ativa para este lead. Selecione uma sequência para iniciar.
            </p>
            <div className="flex gap-2">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione uma cadência" />
                </SelectTrigger>
                <SelectContent>
                  {cadences
                    .filter((c) => c.status === "ativa")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleStart} disabled={!selected || start.isPending}>
                <Play className="mr-1 h-4 w-4" /> Iniciar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{activeCadence?.nome ?? "Cadência"}</span>
              <Badge variant={status === "ativa" ? "default" : status === "pausada" ? "secondary" : "outline"}>
                {LEAD_CADENCE_STATUS_LABEL[status]}
              </Badge>
              <Badge variant="outline">
                Etapa {active.etapa_atual}
                {totalSteps ? ` / ${totalSteps}` : ""}
              </Badge>
            </div>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Etapa atual</dt>
                <dd>{currentStep?.nome ?? active.proxima_acao ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Próxima ação</dt>
                <dd>{active.proxima_acao ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Data prevista</dt>
                <dd>{fmtDate(active.data_proxima_acao)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Iniciada em</dt>
                <dd>{fmtDate(active.data_inicio)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 pt-1">
              {status !== "concluida" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    run(
                      () => advance.mutateAsync(active.id),
                      "Etapa avançada e mensagem enviada",
                    )
                  }
                  disabled={advance.isPending}
                >
                  <ChevronRight className="mr-1 h-4 w-4" />
                  Avançar etapa
                </Button>
              ) : null}
              {status === "ativa" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => pause.mutateAsync(active.id), "Cadência pausada")}
                  disabled={pause.isPending}
                >
                  <Pause className="mr-1 h-4 w-4" /> Pausar
                </Button>
              ) : status === "pausada" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => resume.mutateAsync(active.id), "Cadência retomada")}
                  disabled={resume.isPending}
                >
                  <Play className="mr-1 h-4 w-4" /> Retomar
                </Button>
              ) : null}
              {status !== "concluida" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => run(() => finish.mutateAsync(active.id), "Cadência finalizada")}
                  disabled={finish.isPending}
                >
                  <Square className="mr-1 h-4 w-4" /> Finalizar
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CircleCheck className="h-3.5 w-3.5" /> Cadência concluída
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
