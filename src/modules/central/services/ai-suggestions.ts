/**
 * Sugestões da IA Assistente — heurística determinística (sem LLM).
 * Combina tarefas atrasadas, follow-ups vencidos, homologações e
 * reuniões próximas para propor "o que fazer agora".
 */

import type { FollowUpItem } from "./central-aggregator";
import { deriveTaskStatus, type Task, type CalendarEvent } from "../types/central.types";

export type Suggestion = {
  id: string;
  titulo: string;
  descricao: string;
  urgencia: "urgente" | "alta" | "media";
  cta?: { label: string; to: string };
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtTime(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

export function generateSuggestions(input: {
  tasks: Task[];
  events: CalendarEvent[];
  followUps: FollowUpItem[];
}): Suggestion[] {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const suggestions: Suggestion[] = [];

  // 1. Tarefas urgentes atrasadas
  const urgentesAtrasadas = input.tasks
    .filter((t) => t.prioridade === "urgente" && deriveTaskStatus(t, now) === "atrasada")
    .slice(0, 2);
  for (const t of urgentesAtrasadas) {
    suggestions.push({
      id: `urg-${t.id}`,
      titulo: `Priorizar tarefa urgente atrasada`,
      descricao: `"${t.titulo}" venceu em ${fmtDate(t.prazo ?? t.data)}. Sugiro tratar antes de qualquer nova demanda.`,
      urgencia: "urgente",
      cta: { label: "Abrir tarefa", to: `/tarefas?view=lista&open=${t.id}` },
    });
  }

  // 2. Follow-ups vencidos (limita a 3)
  const vencidos = input.followUps.filter((f) => f.vencida).slice(0, 3);
  for (const f of vencidos) {
    suggestions.push({
      id: `fup-${f.leadId}`,
      titulo: `Retomar contato com ${f.empresaNome}`,
      descricao: `Follow-up "${f.proximaAcao ?? "próxima ação"}" venceu em ${fmtDate(f.data)}. Sugiro entrar em contato hoje.`,
      urgencia: "alta",
      cta: { label: "Abrir lead", to: `/prospeccao/${f.leadId}` },
    });
  }

  // 3. Homologações paradas há > 3 dias
  const homologParadas = input.tasks
    .filter((t) => t.status === "homologacao")
    .filter((t) => {
      const dt = new Date(t.updated_at);
      const diff = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 3;
    })
    .slice(0, 2);
  for (const t of homologParadas) {
    suggestions.push({
      id: `hom-${t.id}`,
      titulo: `Homologar ${t.titulo}`,
      descricao: `A tarefa está em homologação há alguns dias. Sugiro concluir antes de iniciar novos itens.`,
      urgencia: "alta",
      cta: { label: "Abrir tarefa", to: `/tarefas?view=lista&open=${t.id}` },
    });
  }

  // 4. Reuniões nas próximas 2 horas
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const proximosEventos = input.events
    .filter((e) => e.data === today && e.hora_inicio)
    .filter((e) => {
      const [hh, mm] = (e.hora_inicio ?? "00:00").split(":").map(Number);
      const dt = new Date(now);
      dt.setHours(hh ?? 0, mm ?? 0, 0, 0);
      return dt > now && dt <= in2h;
    });
  for (const e of proximosEventos.slice(0, 2)) {
    suggestions.push({
      id: `evt-${e.id}`,
      titulo: `Preparar-se para ${e.titulo}`,
      descricao: `${e.tipo === "reuniao" ? "Reunião" : "Compromisso"} às ${fmtTime(e.hora_inicio)}. Reserve alguns minutos para o pré.`,
      urgencia: "media",
    });
  }

  // 5. Tarefas de hoje agendadas (top 2 por prioridade)
  if (suggestions.length < 5) {
    const doDia = input.tasks
      .filter((t) => t.data === today && t.status !== "concluida" && t.status !== "cancelada")
      .sort((a, b) => {
        const p: Record<Task["prioridade"], number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
        return p[a.prioridade] - p[b.prioridade];
      })
      .slice(0, 5 - suggestions.length);
    for (const t of doDia) {
      suggestions.push({
        id: `today-${t.id}`,
        titulo: `Encaixar "${t.titulo}" na agenda`,
        descricao: `Agendada para hoje${t.hora_inicio ? ` às ${fmtTime(t.hora_inicio)}` : ""}. Prioridade ${t.prioridade}.`,
        urgencia: "media",
        cta: { label: "Abrir tarefa", to: `/tarefas?view=agenda&open=${t.id}` },
      });
    }
  }

  return suggestions.slice(0, 5);
}
