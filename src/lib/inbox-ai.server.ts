/**
 * Helpers server-only do módulo Inbox IA.
 * Contém a memória de contexto do workspace, a transcrição de áudio
 * e a classificação (Rascunho Inteligente) via Lovable AI Gateway.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const CHAT_MODEL = "openai/gpt-5.6-sol";
export const STT_MODEL = "openai/gpt-4o-mini-transcribe";

type DB = SupabaseClient<Database>;

export class GatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  return key;
}

function gatewayMessage(status: number, body: string): string {
  if (status === 429) return "Limite de uso da IA atingido. Tente novamente em instantes.";
  if (status === 402) return "Créditos de IA esgotados no workspace.";
  return `Falha na IA (${status}): ${body.slice(0, 300)}`;
}

/* ─────────── Multi-tenant ─────────── */

export async function assertMembership(supabase: DB, workspaceId: string): Promise<void> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Workspace inválido para este usuário.");
}

/* ─────────── Limite de uso ─────────── */

const DAILY_LIMIT = 200;

export async function assertDailyQuota(
  supabase: DB,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error } = await supabase
    .from("ai_processing_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return;
  if ((count ?? 0) >= DAILY_LIMIT) {
    throw new Error("Limite diário de processamentos de IA atingido.");
  }
}

export async function logProcessing(
  supabase: DB,
  entry: {
    workspace_id: string;
    user_id: string;
    inbox_id?: string | null;
    etapa: string;
    modelo?: string;
    tokens_input?: number | null;
    tokens_output?: number | null;
    audio_seg?: number | null;
    latencia_ms?: number;
    status?: string;
    erro?: string | null;
  },
): Promise<void> {
  await supabase.from("ai_processing_logs").insert(entry);
}

/* ─────────── Memória de contexto do workspace ─────────── */

export interface WorkspaceAiContext {
  hoje: string;
  projetos: string[];
  empresas: string[];
  leads: string[];
  tarefas_abertas: string[];
  historico: Array<{ texto: string; tipo: string; categoria: string | null }>;
}

function nomeFromJson(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const nome = d.nome_fantasia ?? d.razao_social ?? d.nome ?? d.empresa ?? d.titulo;
  return typeof nome === "string" && nome.trim() ? nome.trim() : null;
}

export async function buildWorkspaceContext(
  supabase: DB,
  workspaceId: string,
): Promise<WorkspaceAiContext> {
  const [tasksRes, empresasRes, leadsRes, historicoRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("titulo, prazo, projeto, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "concluida")
      .neq("status", "cancelada")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("empresas")
      .select("data")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("leads")
      .select("data")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("inbox_ai")
      .select("conteudo_raw, tipo_confirmado, categoria")
      .eq("workspace_id", workspaceId)
      .eq("status", "aprovado")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const tasks = tasksRes.data ?? [];
  const projetos = Array.from(
    new Set(tasks.map((t) => t.projeto).filter((p): p is string => Boolean(p))),
  ).slice(0, 30);

  const tarefas_abertas = tasks
    .slice(0, 30)
    .map((t) => (t.prazo ? `${t.titulo} (prazo ${t.prazo})` : t.titulo));

  const empresas = (empresasRes.data ?? [])
    .map((e) => nomeFromJson(e.data))
    .filter((n): n is string => Boolean(n));

  const leads = (leadsRes.data ?? [])
    .map((l) => {
      const d = (l.data ?? {}) as Record<string, unknown>;
      const nome = nomeFromJson(l.data);
      const etapa = typeof d.etapa === "string" ? d.etapa : null;
      return nome ? (etapa ? `${nome} — ${etapa}` : nome) : null;
    })
    .filter((n): n is string => Boolean(n));

  const historico = (historicoRes.data ?? []).map((h) => ({
    texto: (h.conteudo_raw ?? "").slice(0, 160),
    tipo: h.tipo_confirmado ?? "tarefa",
    categoria: h.categoria ?? null,
  }));

  return {
    hoje: new Date().toISOString().slice(0, 10),
    projetos,
    empresas,
    leads,
    tarefas_abertas,
    historico,
  };
}

/* ─────────── Transcrição ─────────── */

export async function transcribeWav(base64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("model", STT_MODEL);
  form.append("file", new Blob([bytes], { type: "audio/wav" }), "recording.wav");

  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) {
    throw new GatewayError(res.status, gatewayMessage(res.status, await res.text()));
  }
  const json = (await res.json()) as { text?: string };
  return json.text?.trim() ?? "";
}

/* ─────────── Classificação (Rascunho Inteligente) ─────────── */

const CATEGORIAS = [
  "comercial",
  "desenvolvimento",
  "marketing",
  "financeiro",
  "suporte",
  "administrativo",
  "conteudo",
  "videoaula",
  "projeto",
];

export interface RawSuggestion {
  tipo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  prazo: string | null;
  projeto: string | null;
  empresa: string | null;
  lead: string | null;
  proximas_acoes: string[];
  confianca: number;
}

function systemPrompt(ctx: WorkspaceAiContext): string {
  const lista = (arr: string[]) => (arr.length ? arr.join(" | ") : "(nenhum)");
  return [
    "Você é o assistente da Inbox IA do Growth OS, um sistema de gestão em português do Brasil.",
    "Receberá uma captura rápida (voz transcrita, texto digitado ou conteúdo colado) e deve propor um RASCUNHO.",
    "Nada será criado automaticamente: você apenas sugere. Seja objetivo e escreva em PT-BR.",
    "",
    `Data de hoje: ${ctx.hoje}. Converta expressões como 'amanhã' ou 'sexta que vem' em datas ISO (YYYY-MM-DD).`,
    "",
    "CONTEXTO DO WORKSPACE (use estes valores; não invente entidades novas — devolva null quando não houver correspondência confiável):",
    `Projetos ativos: ${lista(ctx.projetos)}`,
    `Empresas: ${lista(ctx.empresas)}`,
    `Leads: ${lista(ctx.leads)}`,
    `Tarefas abertas: ${lista(ctx.tarefas_abertas)}`,
    ctx.historico.length
      ? `Classificações aprovadas anteriormente: ${ctx.historico
          .map((h) => `"${h.texto}" -> ${h.tipo}/${h.categoria ?? "-"}`)
          .join(" ; ")}`
      : "",
    "",
    "Responda APENAS com um objeto JSON com as chaves:",
    'tipo (ideia|tarefa|projeto|lembrete|nota), titulo (até 80 caracteres), descricao (até 400 caracteres),',
    `categoria (${CATEGORIAS.join("|")}), prioridade (baixa|media|alta|urgente),`,
    "prazo (YYYY-MM-DD ou null), projeto (string ou null), empresa (string ou null), lead (string ou null),",
    "proximas_acoes (array com até 5 frases curtas de ação), confianca (0 a 1).",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function classifyCapture(
  texto: string,
  ctx: WorkspaceAiContext,
): Promise<{ suggestion: RawSuggestion; usage: { input?: number; output?: number } }> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(ctx) },
        { role: "user", content: texto.slice(0, 8000) },
      ],
    }),
  });

  if (!res.ok) {
    throw new GatewayError(res.status, gatewayMessage(res.status, await res.text()));
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<RawSuggestion> = {};
  try {
    parsed = JSON.parse(content) as Partial<RawSuggestion>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]) as Partial<RawSuggestion>;
      } catch {
        parsed = {};
      }
    }
  }

  return {
    suggestion: normalize(parsed, texto),
    usage: {
      input: json.usage?.prompt_tokens,
      output: json.usage?.completion_tokens,
    },
  };
}

function normalize(raw: Partial<RawSuggestion>, texto: string): RawSuggestion {
  const tipos = ["ideia", "tarefa", "projeto", "lembrete", "nota"];
  const prioridades = ["baixa", "media", "alta", "urgente"];
  const clampStr = (v: unknown, max: number, fallback = "") =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;
  const isoDate = (v: unknown) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

  return {
    tipo: tipos.includes(String(raw.tipo)) ? String(raw.tipo) : "tarefa",
    titulo: clampStr(raw.titulo, 80, texto.slice(0, 80) || "Captura sem título"),
    descricao: clampStr(raw.descricao, 400, texto.slice(0, 400)),
    categoria: CATEGORIAS.includes(String(raw.categoria))
      ? String(raw.categoria)
      : "administrativo",
    prioridade: prioridades.includes(String(raw.prioridade))
      ? String(raw.prioridade)
      : "media",
    prazo: isoDate(raw.prazo),
    projeto: clampStr(raw.projeto, 80) || null,
    empresa: clampStr(raw.empresa, 120) || null,
    lead: clampStr(raw.lead, 120) || null,
    proximas_acoes: Array.isArray(raw.proximas_acoes)
      ? raw.proximas_acoes
          .map((a) => clampStr(a, 120))
          .filter(Boolean)
          .slice(0, 5)
      : [],
    confianca:
      typeof raw.confianca === "number" && raw.confianca >= 0 && raw.confianca <= 1
        ? raw.confianca
        : 0.5,
  };
}
