import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  Phone,
  Plus,
  Target,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentRole } from "@/hooks/use-current-role";
import { can } from "@/config/rbac";
import { getCurrentUserName, useCurrentUserId, useCurrentWorkspaceId } from "@/lib/workspace";
import {
  createLeadTask,
  useLeads,
  type Lead,
  type LeadStatus,
} from "@/modules/prospeccao";
import { useQueryClient } from "@tanstack/react-query";
import { leadsKeys } from "@/modules/prospeccao/hooks/use-leads";
import { updateLead } from "@/modules/prospeccao/services/leads.service";
import type { LeadTaskPrioridade } from "@/modules/prospeccao/types/entities.types";

export const Route = createFileRoute("/prospeccao/follow-up")({
  head: () => ({
    meta: [
      { title: "Follow-up — Prospecção — Growth OS" },
      { name: "description", content: "Central de próximas ações da prospecção." },
    ],
  }),
  component: FollowUpPage,
});

type Bucket = "atrasados" | "hoje" | "proximos" | "sem_data";

const ACTIVE_STATUSES: LeadStatus[] = [
  "novo_lead",
  "primeiro_contato",
  "whatsapp",
  "respondeu",
  "reuniao",
  "proposta",
  "negociacao",
];

function localDateIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function formatDate(value?: string) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function bucketFor(date?: string): Bucket {
  if (!date) return "sem_data";
  const today = localDateIso();
  if (date < today) return "atrasados";
  if (date === today) return "hoje";
  return "proximos";
}

function BucketIcon({ bucket }: { bucket: Bucket }) {
  if (bucket === "atrasados") return <AlertCircle className="h-4 w-4" />;
  if (bucket === "hoje") return <Clock3 className="h-4 w-4" />;
  if (bucket === "proximos") return <CalendarClock className="h-4 w-4" />;
  return <Target className="h-4 w-4" />;
}

const bucketLabels: Record<Bucket, string> = {
  atrasados: "Atrasados",
  hoje: "Hoje",
  proximos: "Próximos",
  sem_data: "Sem próxima ação",
};

function FollowUpCard({
  lead,
  onOpen,
  onSchedule,
}: {
  lead: Lead;
  onOpen: () => void;
  onSchedule: (lead: Lead) => void;
}) {
  const contact = lead.whatsapp || lead.telefone;
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
            <div className="truncate font-medium">{lead.nome_empresa}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {lead.cidade ? <span>{lead.cidade}{lead.estado ? ` / ${lead.estado}` : ""}</span> : null}
              {lead.responsavel ? <span>• {lead.responsavel}</span> : null}
            </div>
          </button>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <div className="text-xs font-medium text-muted-foreground">Próxima ação</div>
          <div className="mt-1 font-medium">{lead.proxima_acao || "Definir próxima ação"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDate(lead.data_proxima_acao)}</div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lead.whatsapp ? (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          ) : contact ? (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <a href={`tel:${contact}`}>
                <Phone className="h-3.5 w-3.5" /> Ligar
              </a>
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => onSchedule(lead)}>
            <Plus className="h-3.5 w-3.5" /> Agendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleInline({
  lead,
  onDone,
}: {
  lead: Lead;
  onDone: () => void;
}) {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [action, setAction] = useState(lead.proxima_acao || "Fazer follow-up");
  const [date, setDate] = useState(lead.data_proxima_acao || addDaysIso(1));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!action.trim() || !date) return;
    setSaving(true);
    try {
      const { id, workspace_id, created_at, updated_at, ...input } = lead;
      await updateLead(workspaceId, lead.id, {
        ...input,
        proxima_acao: action.trim(),
        data_proxima_acao: date,
      });
      await createLeadTask(workspaceId, lead.id, {
        titulo: action.trim(),
        data: date,
        prioridade: "media" as LeadTaskPrioridade,
        responsavel_id: userId,
      });
      await queryClient.invalidateQueries({ queryKey: leadsKeys.all(workspaceId) });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[1fr_150px_auto]">
      <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Próxima ação" />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Button size="sm" onClick={save} disabled={saving || !action.trim()}>
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}

function FollowUpPage() {
  const role = useCurrentRole();
  const canView = can(role, "prospeccao:view");
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useLeads();
  const [bucket, setBucket] = useState<Bucket>("atrasados");
  const [search, setSearch] = useState("");
  const [scheduling, setScheduling] = useState<string | null>(null);

  const activeLeads = useMemo(
    () => (data ?? []).filter((lead) => ACTIVE_STATUSES.includes(lead.status)),
    [data],
  );

  const grouped = useMemo(() => {
    const result: Record<Bucket, Lead[]> = {
      atrasados: [],
      hoje: [],
      proximos: [],
      sem_data: [],
    };
    const term = search.trim().toLowerCase();
    for (const lead of activeLeads) {
      if (
        term &&
        !lead.nome_empresa.toLowerCase().includes(term) &&
        !(lead.contato_nome?.toLowerCase().includes(term) ?? false) &&
        !(lead.cidade?.toLowerCase().includes(term) ?? false)
      ) continue;
      result[bucketFor(lead.data_proxima_acao)].push(lead);
    }
    for (const key of Object.keys(result) as Bucket[]) {
      result[key].sort((a, b) => (a.data_proxima_acao || "9999").localeCompare(b.data_proxima_acao || "9999"));
    }
    return result;
  }, [activeLeads, search]);

  const counts = useMemo(() => {
    const base = { atrasados: 0, hoje: 0, proximos: 0, sem_data: 0 } as Record<Bucket, number>;
    activeLeads.forEach((lead) => { base[bucketFor(lead.data_proxima_acao)] += 1; });
    return base;
  }, [activeLeads]);

  if (!canView) {
    return <div className="mx-auto w-full max-w-[1400px] px-4 py-6"><ErrorState title="Sem permissão" description="Você não tem acesso ao módulo Prospecção." /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Follow-up"
        description="Organize o próximo passo de cada Lead e não deixe oportunidades paradas."
        icon={<CalendarClock className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/prospeccao/lista" })} className="gap-2">
              <Users className="h-4 w-4" /> Leads
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["atrasados", "hoje", "proximos", "sem_data"] as Bucket[]).map((key) => (
          <button key={key} onClick={() => setBucket(key)} className="text-left">
            <Card className={bucket === key ? "ring-2 ring-primary" : "transition-shadow hover:shadow-sm"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium"><BucketIcon bucket={key} /> {bucketLabels[key]}</div>
                  <Badge variant={key === "atrasados" && counts[key] > 0 ? "destructive" : "secondary"}>{counts[key]}</Badge>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar Lead, contato ou cidade…" className="sm:max-w-sm" />
        <div className="text-sm text-muted-foreground">{grouped[bucket].length} Lead(s) nesta visão</div>
      </div>

      {isLoading ? <LoadingState label="Carregando follow-ups…" /> : isError ? <ErrorState onRetry={() => refetch()} /> : (
        <div className="mt-5 space-y-3">
          {grouped[bucket].length === 0 ? (
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" /> Tudo certo por aqui</CardTitle></CardHeader><CardContent className="pt-0 text-sm text-muted-foreground">Nenhum Lead encontrado nesta categoria. Use “Sem próxima ação” para localizar Leads que precisam de planejamento.</CardContent></Card>
          ) : grouped[bucket].map((lead) => (
            <div key={lead.id}>
              <FollowUpCard lead={lead} onOpen={() => navigate({ to: "/prospeccao/$id", params: { id: lead.id } })} onSchedule={() => setScheduling(scheduling === lead.id ? null : lead.id)} />
              {scheduling === lead.id ? <ScheduleInline lead={lead} onDone={() => setScheduling(null)} /> : null}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Como usar:</strong> importe seus Leads por CSV, trabalhe a abordagem e sempre deixe uma próxima ação com data. O Follow-up organiza automaticamente os atrasados, os de hoje, os próximos e os que ainda estão sem data.
      </div>
    </div>
  );
}
