/**
 * Tipos do módulo Inbox IA — capturas rápidas (voz, texto, colagem)
 * que entram como "Rascunho Inteligente" antes de virarem tarefa/nota.
 */

import type { Tables } from "@/integrations/supabase/types";
import type { TaskCategoria, TaskPrioridade } from "@/modules/central/types/central.types";

export type InboxRow = Tables<"inbox_ai">;

export const INBOX_ORIGENS = ["texto", "colado"] as const;
export type InboxOrigem = (typeof INBOX_ORIGENS)[number];
export const INBOX_ORIGEM_LABEL: Record<InboxOrigem, string> = {
  texto: "Texto",
  colado: "Colado",
};

export const INBOX_TIPOS = ["ideia", "tarefa", "projeto", "lembrete", "nota"] as const;
export type InboxTipo = (typeof INBOX_TIPOS)[number];
export const INBOX_TIPO_LABEL: Record<InboxTipo, string> = {
  ideia: "Ideia",
  tarefa: "Tarefa",
  projeto: "Projeto",
  lembrete: "Lembrete",
  nota: "Nota",
};

export const INBOX_STATUS = [
  "capturado",
  "processando",
  "sugerido",
  "aprovado",
  "descartado",
  "erro",
] as const;
export type InboxStatus = (typeof INBOX_STATUS)[number];
export const INBOX_STATUS_LABEL: Record<InboxStatus, string> = {
  capturado: "Capturado",
  processando: "Processando",
  sugerido: "Sugerido",
  aprovado: "Aprovado",
  descartado: "Descartado",
  erro: "Erro",
};
export const INBOX_STATUS_TONE: Record<
  InboxStatus,
  "neutral" | "info" | "warning" | "success" | "destructive"
> = {
  capturado: "neutral",
  processando: "info",
  sugerido: "warning",
  aprovado: "success",
  descartado: "neutral",
  erro: "destructive",
};

export interface InboxItem {
  id: string;
  workspace_id: string;
  criado_por: string;
  origem: InboxOrigem;
  origem_detalhe: string | null;
  audio_path: string | null;
  duracao_seg: number | null;
  conteudo_raw: string;
  conteudo_editado: string | null;
  tipo_sugerido: InboxTipo | null;
  tipo_confirmado: InboxTipo | null;
  titulo: string | null;
  descricao: string | null;
  categoria: TaskCategoria | null;
  prioridade: TaskPrioridade | null;
  prazo_sugerido: string | null;
  projeto_sugerido: string | null;
  empresa_id: string | null;
  lead_id: string | null;
  proximas_acoes: string[];
  confianca: number | null;
  correcoes: Record<string, unknown>;
  status: InboxStatus;
  convertido_em_tipo: string | null;
  convertido_em_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxCaptureInput {
  origem: InboxOrigem;
  origem_detalhe?: string | null;
  conteudo_raw: string;
  tipo_sugerido?: InboxTipo | null;
  titulo?: string | null;
  prioridade?: TaskPrioridade | null;
}


export function rowToInboxItem(row: InboxRow): InboxItem {
  const acoes = Array.isArray(row.proximas_acoes)
    ? (row.proximas_acoes as unknown[]).map((a) => String(a))
    : [];
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    criado_por: row.criado_por,
    origem: row.origem as InboxOrigem,
    origem_detalhe: row.origem_detalhe,
    audio_path: row.audio_path,
    duracao_seg: row.duracao_seg,
    conteudo_raw: row.conteudo_raw,
    conteudo_editado: row.conteudo_editado,
    tipo_sugerido: row.tipo_sugerido as InboxTipo | null,
    tipo_confirmado: row.tipo_confirmado as InboxTipo | null,
    titulo: row.titulo,
    descricao: row.descricao,
    categoria: row.categoria as TaskCategoria | null,
    prioridade: row.prioridade as TaskPrioridade | null,
    prazo_sugerido: row.prazo_sugerido,
    projeto_sugerido: row.projeto_sugerido,
    empresa_id: row.empresa_id,
    lead_id: row.lead_id,
    proximas_acoes: acoes,
    confianca: row.confianca,
    correcoes: (row.correcoes as Record<string, unknown>) ?? {},
    status: row.status as InboxStatus,
    convertido_em_tipo: row.convertido_em_tipo,
    convertido_em_id: row.convertido_em_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Dias parados desde a criação — usado para "envelhecimento" do rascunho. */
export function inboxAgeInDays(item: InboxItem): number {
  const ms = Date.now() - new Date(item.created_at).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
