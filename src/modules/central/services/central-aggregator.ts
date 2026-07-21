/**
 * Agregador da Minha Central — junta indicadores e follow-ups a partir
 * dos módulos existentes (Prospecção, CRM, Central) sem duplicar dados.
 */

import { supabase } from "@/integrations/supabase/client";

import type { Task } from "../types/central.types";
import { deriveTaskStatus } from "../types/central.types";
import { listTasks } from "./tasks.service";

export type FollowUpItem = {
  leadId: string;
  empresaNome: string;
  contato?: string;
  proximaAcao?: string;
  data?: string;
  status: string;
  vencida: boolean;
};

type LeadRow = {
  id: string;
  data: Record<string, unknown>;
};

type LeadTaskRow = {
  id: string;
  lead_id: string;
  data: Record<string, unknown>;
};

function todayStr(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Follow-ups derivados de leads + lead_tasks pendentes.
 * Prioriza tarefas vencidas e leads em estágios ativos.
 */
export async function listFollowUps(workspaceId: string): Promise<FollowUpItem[]> {
  const [{ data: leads }, { data: leadTasks }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, data")
      .eq("workspace_id", workspaceId)
      .limit(500),
    supabase
      .from("lead_tasks")
      .select("id, lead_id, data")
      .eq("workspace_id", workspaceId)
      .limit(500),
  ]);

  const leadMap = new Map<string, LeadRow>();
  for (const l of (leads ?? []) as LeadRow[]) leadMap.set(l.id, l);
  const today = todayStr();

  const items: FollowUpItem[] = [];

  // Prioridade 1: tarefas pendentes de leads
  for (const t of (leadTasks ?? []) as LeadTaskRow[]) {
    const td = (t.data ?? {}) as {
      titulo?: string;
      data?: string;
      status?: string;
      prioridade?: string;
    };
    if (td.status !== "pendente") continue;
    const lead = leadMap.get(t.lead_id);
    if (!lead) continue;
    const ld = (lead.data ?? {}) as {
      empresa?: string;
      nome?: string;
      telefone?: string;
      whatsapp?: string;
      email?: string;
      status?: string;
    };
    const vencida = Boolean(td.data && td.data < today);
    items.push({
      leadId: lead.id,
      empresaNome: ld.empresa ?? ld.nome ?? "Lead sem nome",
      contato: ld.whatsapp ?? ld.telefone ?? ld.email,
      proximaAcao: td.titulo,
      data: td.data,
      status: ld.status ?? "novo",
      vencida,
    });
  }

  // Ordena: vencidas primeiro, depois por data
  items.sort((a, b) => {
    if (a.vencida !== b.vencida) return a.vencida ? -1 : 1;
    return (a.data ?? "9999") < (b.data ?? "9999") ? -1 : 1;
  });
  return items.slice(0, 20);
}

/* ─────────── Indicadores globais ─────────── */

export type CentralIndicators = {
  paraAgora: number;
  atrasadas: number;
  aguardandoRetorno: number;
  homologacoes: number;
  leadsParaContatar: number;
  followupsAtrasados: number;
  tarefasAbertas: number;
  projetosAtivos: number;
  videosPendentes: number;
  postsPendentes: number;
  chamados: number;
};

export async function computeIndicators(
  workspaceId: string,
): Promise<CentralIndicators> {
  const [tasks, followUps] = await Promise.all([
    listTasks(workspaceId),
    listFollowUps(workspaceId),
  ]);

  const open = tasks.filter(
    (t) => t.status !== "concluida" && t.status !== "cancelada",
  );
  const atrasadas = open.filter((t) => deriveTaskStatus(t) === "atrasada").length;
  const paraAgora = open.filter(
    (t) => t.prioridade === "urgente" || t.prioridade === "alta",
  ).length;
  const aguardando = open.filter((t) => t.status === "aguardando").length;
  const homologacoes = open.filter((t) => t.status === "homologacao").length;
  const videosPendentes = open.filter((t) => t.categoria === "videoaula").length;
  const postsPendentes = open.filter((t) => t.categoria === "conteudo").length;
  const chamados = open.filter((t) => t.categoria === "suporte").length;
  const projetosSet = new Set(
    open
      .filter((t) => t.categoria === "projeto" || t.projeto)
      .map((t) => t.projeto ?? "sem-projeto"),
  );

  const followupsAtrasados = followUps.filter((f) => f.vencida).length;

  return {
    paraAgora,
    atrasadas,
    aguardandoRetorno: aguardando,
    homologacoes,
    leadsParaContatar: followUps.length,
    followupsAtrasados,
    tarefasAbertas: open.length,
    projetosAtivos: projetosSet.size,
    videosPendentes,
    postsPendentes,
    chamados,
  };
}

/** Tarefas agrupadas por projeto (excluindo concluídas/canceladas). */
export function groupTasksByProject(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.status === "concluida" || t.status === "cancelada") continue;
    const key = t.projeto?.trim() || "Sem projeto";
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return map;
}
