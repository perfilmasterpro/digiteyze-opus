import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, MessageCircle, Phone, Target, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import { useCurrentWorkspaceId } from "@/lib/workspace";
import { useCreateLeadTask, useLeads, type Lead, type LeadStatus } from "@/modules/prospeccao";
import { leadsKeys } from "@/modules/prospeccao/hooks/use-leads";
import { updateLead } from "@/modules/prospeccao/services/leads.service";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/prospeccao/follow-up")({
  head: () => ({ meta: [{ title: "Follow-up — Prospecção — Growth OS" }] }),
  component: FollowUpPage,
});

type Bucket = "atrasados" | "hoje" | "proximos" | "sem_data";
const ACTIVE_STATUSES: LeadStatus[] = ["novo_lead", "primeiro_contato", "whatsapp", "respondeu", "reuniao", "proposta", "negociacao"];
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDaysIso(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function bucketFor(date?: string): Bucket { if (!date) return "sem_data"; const today = todayIso(); if (date < today) return "atrasados"; if (date === today) return "hoje"; return "proximos"; }
function dateLabel(date?: string) { if (!date) return "Sem data"; const [y, m, d] = date.split("-"); return `${d}/${m}/${y}`; }
const labels: Record<Bucket, string> = { atrasados: "Atrasados", hoje: "Hoje", proximos: "Próximos", sem_data: "Sem próxima ação" };

function Schedule({ lead, done }: { lead: Lead; done: () => void }) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  const createTask = useCreateLeadTask(lead.id);
  const [action, setAction] = useState(lead.proxima_acao || "Fazer follow-up");
  const [date, setDate] = useState(lead.data_proxima_acao || addDaysIso(1));
  async function save() {
    if (!action.trim() || !date || createTask.isPending) return;
    const input = { ...lead };
    delete input.id; delete input.workspace_id; delete input.created_at; delete input.updated_at;
    await updateLead(workspaceId, lead.id, { ...input, proxima_acao: action.trim(), data_proxima_acao: date });
    await createTask.mutateAsync({ titulo: action.trim(), data: date, prioridade: "media" });
    await qc.invalidateQueries({ queryKey: leadsKeys.all(workspaceId) });
    done();
  }
  return <div className="mt-2 grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_150px_auto]"><Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Próxima ação" /><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /><Button size="sm" onClick={save} disabled={createTask.isPending}>{createTask.isPending ? "Salvando…" : "Salvar"}</Button></div>;
}

function FollowUpPage() {
  const role = useCurrentRole();
  const navigate = useNavigate();
  const canView = can(role, "prospeccao:view");
  const { data, isLoading, isError, refetch } = useLeads();
  const [bucket, setBucket] = useState<Bucket>("atrasados");
  const [search, setSearch] = useState("");
  const [scheduling, setScheduling] = useState<string | null>(null);
  const active = useMemo(() => (data ?? []).filter((l) => ACTIVE_STATUSES.includes(l.status)), [data]);
  const grouped = useMemo(() => {
    const out: Record<Bucket, Lead[]> = { atrasados: [], hoje: [], proximos: [], sem_data: [] };
    const term = search.trim().toLowerCase();
    active.forEach((lead) => {
      if (term && !lead.nome_empresa.toLowerCase().includes(term) && !(lead.contato_nome?.toLowerCase().includes(term) ?? false) && !(lead.cidade?.toLowerCase().includes(term) ?? false)) return;
      out[bucketFor(lead.data_proxima_acao)].push(lead);
    });
    (Object.keys(out) as Bucket[]).forEach((key) => out[key].sort((a, b) => (a.data_proxima_acao || "9999").localeCompare(b.data_proxima_acao || "9999")));
    return out;
  }, [active, search]);
  const counts = useMemo(() => { const c = { atrasados: 0, hoje: 0, proximos: 0, sem_data: 0 } as Record<Bucket, number>; active.forEach((l) => { c[bucketFor(l.data_proxima_acao)] += 1; }); return c; }, [active]);
  if (!canView) return <div className="mx-auto w-full max-w-[1400px] p-6"><ErrorState title="Sem permissão" description="Você não tem acesso ao módulo Prospecção." /></div>;
  return <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8"><PageHeader title="Follow-up" description="Organize o próximo passo de cada Lead e não deixe oportunidades paradas." icon={<CalendarClock className="h-5 w-5" />} actions={<Button variant="outline" size="sm" onClick={() => navigate({ to: "/prospeccao/lista" })}><Users className="mr-2 h-4 w-4" /> Leads</Button>} /><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(labels) as Bucket[]).map((key) => <button key={key} onClick={() => setBucket(key)} className="text-left"><Card className={bucket === key ? "ring-2 ring-primary" : "hover:shadow-sm"}><CardContent className="p-4"><div className="flex items-center justify-between text-sm font-medium"><span>{labels[key]}</span><Badge variant={key === "atrasados" && counts[key] > 0 ? "destructive" : "secondary"}>{counts[key]}</Badge></div></CardContent></Card></button>)}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar Lead, contato ou cidade…" className="sm:max-w-sm" /><span className="text-sm text-muted-foreground">{grouped[bucket].length} Lead(s)</span></div>{isLoading ? <LoadingState label="Carregando follow-ups…" /> : isError ? <ErrorState onRetry={() => refetch()} /> : <div className="mt-5 space-y-3">{grouped[bucket].length === 0 ? <Card><CardHeader><CardTitle className="text-base"><CheckCircle2 className="mr-2 inline h-4 w-4" />Tudo certo por aqui</CardTitle></CardHeader><CardContent className="pt-0 text-sm text-muted-foreground">Nenhum Lead nesta categoria.</CardContent></Card> : grouped[bucket].map((lead) => <Card key={lead.id}><CardContent className="p-4"><button className="w-full text-left" onClick={() => navigate({ to: "/prospeccao/$id", params: { id: lead.id } })}><div className="font-medium">{lead.nome_empresa}</div><div className="mt-1 text-xs text-muted-foreground">{lead.cidade}{lead.estado ? ` / ${lead.estado}` : ""}{lead.responsavel ? ` • ${lead.responsavel}` : ""}</div></button><div className="mt-3 rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Próxima ação</div><div className="font-medium">{lead.proxima_acao || "Definir próxima ação"}</div><div className="text-xs text-muted-foreground">{dateLabel(lead.data_proxima_acao)}</div></div><div className="mt-3 flex flex-wrap gap-2">{lead.whatsapp ? <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-3.5 w-3.5" />WhatsApp</a></Button> : lead.telefone ? <Button size="sm" variant="outline" asChild><a href={`tel:${lead.telefone}`}><Phone className="mr-1 h-3.5 w-3.5" />Ligar</a></Button> : null}<Button size="sm" variant="secondary" onClick={() => setScheduling(scheduling === lead.id ? null : lead.id)}><Target className="mr-1 h-3.5 w-3.5" />Agendar</Button></div>{scheduling === lead.id ? <Schedule lead={lead} done={() => setScheduling(null)} /> : null}</CardContent></Card>)}</div>}<div className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Importe Leads por CSV, trabalhe a abordagem e sempre deixe uma próxima ação com data. O Follow-up organiza automaticamente os atrasados, os de hoje, os próximos e os sem data.</div></div>;
}
