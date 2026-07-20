import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Building2,
  Calendar,
  DollarSign,
  FileEdit,
  Handshake,
  Headset,
  Kanban,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";


import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  EMPRESA_EVENT_MODULE_LABEL,
  EMPRESA_EVENT_TYPE_LABEL,
  type EmpresaEvent,
  type EmpresaEventModule,
  type EmpresaEventType,
} from "../services/empresa-events.service";

const MODULE_ICON: Record<EmpresaEventModule, React.ComponentType<{ className?: string }>> = {
  empresas: Building2,
  prospeccao: Kanban,
  comercial: DollarSign,
  projetos: FileEdit,
  financeiro: DollarSign,
  suporte: Headset,
};

const TYPE_ICON: Record<EmpresaEventType, React.ComponentType<{ className?: string }>> = {
  "empresa.created": Sparkles,
  "empresa.updated": FileEdit,
  "lead.created": Sparkles,
  "lead.updated": FileEdit,
  "lead.stage_changed": RefreshCcw,
  "lead.interaction_created": MessageCircle,
  "lead.task_created": Calendar,
  "lead.converted": ArrowRightLeft,
  "opportunity.created": Handshake,
  "opportunity.updated": FileEdit,
  "opportunity.stage_changed": RefreshCcw,
  "opportunity.won": Trophy,
  "opportunity.lost": XCircle,
};


function fmtGroupKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtGroupLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(date, today)) return "Hoje";
  if (same(date, yest)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function EmpresaTimeline({ events }: { events: EmpresaEvent[] }) {
  const [modulo, setModulo] = useState<"all" | EmpresaEventModule>("all");
  const [tipo, setTipo] = useState<"all" | EmpresaEventType>("all");

  const availableModules = useMemo(
    () => Array.from(new Set(events.map((e) => e.modulo))),
    [events],
  );
  const availableTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.tipo))),
    [events],
  );

  const filtered = useMemo(
    () =>
      events.filter(
        (e) => (modulo === "all" || e.modulo === modulo) && (tipo === "all" || e.tipo === tipo),
      ),
    [events, modulo, tipo],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, EmpresaEvent[]>();
    for (const e of filtered) {
      const key = fmtGroupKey(e.occurred_at);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="Sem eventos ainda"
        description="Ações da Prospecção, Comercial, Projetos e demais módulos aparecerão aqui em ordem cronológica."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={modulo} onValueChange={(v) => setModulo(v as typeof modulo)}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filtrar por módulo">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os módulos</SelectItem>
            {availableModules.map((m) => (
              <SelectItem key={m} value={m}>
                {EMPRESA_EVENT_MODULE_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
          <SelectTrigger className="h-9 w-[220px]" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {availableTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {EMPRESA_EVENT_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} evento{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum evento com esses filtros"
          description="Ajuste os filtros de módulo e tipo para ver mais eventos."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, items]) => (
            <section key={key} aria-label={fmtGroupLabel(key)}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {fmtGroupLabel(key)}
              </h3>
              <Card>
                <CardContent className="p-0">
                  <ol className="divide-y">
                    {items.map((e) => {
                      const ModuleIcon = MODULE_ICON[e.modulo] ?? Activity;
                      const TypeIcon = TYPE_ICON[e.tipo] ?? Activity;
                      return (
                        <li key={e.id} className="flex gap-3 p-4">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {e.titulo}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {fmtTime(e.occurred_at)}
                              </span>
                            </div>
                            {e.descricao ? (
                              <p className="mt-0.5 text-sm text-muted-foreground">{e.descricao}</p>
                            ) : null}
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="gap-1">
                                <ModuleIcon className="h-3 w-3" />
                                {EMPRESA_EVENT_MODULE_LABEL[e.modulo]}
                              </Badge>
                              {e.created_by_name ? <span>por {e.created_by_name}</span> : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
