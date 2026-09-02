/**
 * Camada de FERRAMENTAS do agente (server-only).
 *
 * Cada ferramenta recebe o client Supabase autenticado do usuário
 * (RLS aplicada como o próprio usuário) — o agente nunca ultrapassa
 * as permissões que a pessoa já possui.
 *
 * Para adicionar uma nova ferramenta:
 *   1. Declare o schema em AGENT_TOOLS (formato JSON Schema)
 *   2. Implemente o executor em TOOL_EXECUTORS com a mesma chave
 * Nada mais precisa mudar no fluxo de chat.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/integrations/supabase/types";

export type AgentSupabase = SupabaseClient<Database>;

export interface ToolContext {
  supabase: AgentSupabase;
  workspaceId: string;
  userId: string;
  userName: string;
}

export interface ToolDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

type ToolExecutor = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<{ ok: boolean; resumo: string; data?: unknown }>;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/* ────────────────────────── Schemas ────────────────────────── */

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    name: "listar_projetos",
    description:
      "Lista os projetos do usuário (derivados do campo projeto das tarefas) com contagem de tarefas abertas, concluídas e atrasadas. Use para saber onde o trabalho está parado ou em andamento.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    type: "function",
    name: "listar_tarefas",
    description:
      "Consulta tarefas do Growth. Permite filtrar por status, projeto, prioridade, texto e por atrasadas ou pelo dia de hoje.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "pendente | em_andamento | aguardando | homologacao | concluida | cancelada",
        },
        projeto: { type: "string", description: "Nome (ou parte) do projeto" },
        prioridade: { type: "string", description: "baixa | media | alta | urgente" },
        busca: { type: "string", description: "Texto no título da tarefa" },
        atrasadas: { type: "boolean", description: "Somente tarefas com prazo vencido" },
        hoje: { type: "boolean", description: "Somente tarefas com data igual a hoje" },
        limite: { type: "number", description: "Máximo de tarefas (padrão 25)" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "criar_tarefa",
    description:
      "Cria uma nova tarefa no módulo Central do Growth. Use sempre que o usuário pedir para criar/agendar algo.",
    parameters: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        descricao: { type: "string" },
        categoria: {
          type: "string",
          description:
            "comercial | desenvolvimento | marketing | financeiro | suporte | administrativo | conteudo | videoaula | projeto",
        },
        prioridade: { type: "string", description: "baixa | media | alta | urgente" },
        data: { type: "string", description: "Data de execução AAAA-MM-DD" },
        prazo: { type: "string", description: "Prazo AAAA-MM-DD" },
        projeto: { type: "string" },
      },
      required: ["titulo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "atualizar_tarefa",
    description:
      "Atualiza uma tarefa existente (status, prioridade, prazo, data, projeto, título ou descrição). Requer o id da tarefa — obtenha antes com listar_tarefas.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID da tarefa" },
        status: { type: "string" },
        prioridade: { type: "string" },
        titulo: { type: "string" },
        descricao: { type: "string" },
        data: { type: "string" },
        prazo: { type: "string" },
        projeto: { type: "string" },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "buscar_empresas",
    description: "Busca empresas/clientes cadastrados pelo nome.",
    parameters: {
      type: "object",
      properties: {
        busca: { type: "string", description: "Nome ou parte do nome" },
        limite: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "listar_atividades",
    description:
      "Consulta as atividades/eventos recentes registrados no histórico das empresas do workspace.",
    parameters: {
      type: "object",
      properties: {
        empresa_id: { type: "string" },
        limite: { type: "number", description: "Padrão 20" },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "registrar_atividade",
    description:
      "Registra uma atividade na timeline de uma empresa. Informe empresa_id (use buscar_empresas antes) e uma descrição do que aconteceu.",
    parameters: {
      type: "object",
      properties: {
        empresa_id: { type: "string" },
        titulo: { type: "string" },
        descricao: { type: "string" },
      },
      required: ["empresa_id", "titulo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "salvar_memoria",
    description:
      "Salva uma informação relevante e persistente na memória do agente (decisão, preferência, contexto de projeto, próximo passo, resumo ou fato). Use apenas para o que realmente precisa persistir entre conversas — nunca para todo o histórico.",
    parameters: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        conteudo: { type: "string" },
        categoria: {
          type: "string",
          description: "decisao | preferencia | contexto | proximo_passo | resumo | fato",
        },
        importancia: { type: "number", description: "1 a 5" },
        projeto: { type: "string" },
        empresa_id: { type: "string" },
        task_id: { type: "string" },
      },
      required: ["titulo", "conteudo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "listar_memorias",
    description: "Consulta memórias salvas do agente, opcionalmente filtradas por projeto ou texto.",
    parameters: {
      type: "object",
      properties: {
        projeto: { type: "string" },
        busca: { type: "string" },
        limite: { type: "number" },
      },
      additionalProperties: false,
    },
  },
];

/* ────────────────────────── Executores ────────────────────────── */

const today = () => new Date().toISOString().slice(0, 10);

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  async listar_projetos(_args, ctx) {
    const { data, error } = await ctx.supabase
      .from("tasks")
      .select("projeto, status, prazo")
      .eq("workspace_id", ctx.workspaceId);
    if (error) return { ok: false, resumo: error.message };

    const map = new Map<string, { abertas: number; concluidas: number; atrasadas: number }>();
    for (const row of data ?? []) {
      const nome = row.projeto?.trim() || "Sem projeto";
      const acc = map.get(nome) ?? { abertas: 0, concluidas: 0, atrasadas: 0 };
      if (row.status === "concluida" || row.status === "cancelada") acc.concluidas += 1;
      else {
        acc.abertas += 1;
        if (row.prazo && row.prazo < today()) acc.atrasadas += 1;
      }
      map.set(nome, acc);
    }
    const projetos = [...map.entries()].map(([nome, v]) => ({ nome, ...v }));
    return { ok: true, resumo: `${projetos.length} projeto(s)`, data: projetos };
  },

  async listar_tarefas(args, ctx) {
    let q = ctx.supabase
      .from("tasks")
      .select("id, titulo, status, prioridade, categoria, projeto, data, prazo, descricao")
      .eq("workspace_id", ctx.workspaceId);

    const status = str(args.status);
    if (status) q = q.eq("status", status as Database["public"]["Enums"]["task_status"]);
    const prioridade = str(args.prioridade);
    if (prioridade)
      q = q.eq("prioridade", prioridade as Database["public"]["Enums"]["task_prioridade"]);
    const projeto = str(args.projeto);
    if (projeto) q = q.ilike("projeto", `%${projeto}%`);
    const busca = str(args.busca);
    if (busca) q = q.ilike("titulo", `%${busca}%`);
    if (args.atrasadas === true) {
      q = q.lt("prazo", today()).not("status", "in", "(concluida,cancelada)");
    }
    if (args.hoje === true) q = q.eq("data", today());

    const limite = typeof args.limite === "number" ? Math.min(args.limite, 100) : 25;
    const { data, error } = await q
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(limite);
    if (error) return { ok: false, resumo: error.message };
    return { ok: true, resumo: `${data?.length ?? 0} tarefa(s)`, data };
  },

  async criar_tarefa(args, ctx) {
    const titulo = str(args.titulo);
    if (!titulo) return { ok: false, resumo: "Título obrigatório." };
    const { data, error } = await ctx.supabase
      .from("tasks")
      .insert({
        workspace_id: ctx.workspaceId,
        criado_por: ctx.userId,
        responsavel_id: ctx.userId,
        titulo,
        descricao: str(args.descricao) ?? null,
        categoria: (str(args.categoria) ??
          "administrativo") as Database["public"]["Enums"]["task_categoria"],
        prioridade: (str(args.prioridade) ??
          "media") as Database["public"]["Enums"]["task_prioridade"],
        status: "pendente",
        origem: "ia",
        projeto: str(args.projeto) ?? null,
        data: str(args.data) ?? null,
        prazo: str(args.prazo) ?? null,
      })
      .select("id, titulo, data, prazo, status, prioridade, projeto")
      .single();
    if (error) return { ok: false, resumo: error.message };
    return { ok: true, resumo: `Tarefa criada: ${data.titulo}`, data };
  },

  async atualizar_tarefa(args, ctx) {
    const id = str(args.id);
    if (!id) return { ok: false, resumo: "id da tarefa obrigatório." };
    const patch: Database["public"]["Tables"]["tasks"]["Update"] = {};
    const status = str(args.status);
    if (status) patch.status = status as Database["public"]["Enums"]["task_status"];
    const prioridade = str(args.prioridade);
    if (prioridade) patch.prioridade = prioridade as Database["public"]["Enums"]["task_prioridade"];
    const titulo = str(args.titulo);
    if (titulo) patch.titulo = titulo;
    const descricao = str(args.descricao);
    if (descricao) patch.descricao = descricao;
    const dataValue = str(args.data);
    if (dataValue) patch.data = dataValue;
    const prazo = str(args.prazo);
    if (prazo) patch.prazo = prazo;
    const projeto = str(args.projeto);
    if (projeto) patch.projeto = projeto;
    if (patch.status === "concluida") patch.completed_at = new Date().toISOString();
    if (Object.keys(patch).length === 0) return { ok: false, resumo: "Nada para atualizar." };

    const { data, error } = await ctx.supabase
      .from("tasks")
      .update(patch)
      .eq("workspace_id", ctx.workspaceId)
      .eq("id", id)
      .select("id, titulo, status, prioridade, data, prazo, projeto")
      .maybeSingle();
    if (error) return { ok: false, resumo: error.message };
    if (!data) return { ok: false, resumo: "Tarefa não encontrada ou sem permissão." };
    return { ok: true, resumo: `Tarefa atualizada: ${data.titulo}`, data };
  },

  async buscar_empresas(args, ctx) {
    const limite = typeof args.limite === "number" ? Math.min(args.limite, 50) : 20;
    const { data, error } = await ctx.supabase
      .from("empresas")
      .select("id, data")
      .eq("workspace_id", ctx.workspaceId)
      .limit(200);
    if (error) return { ok: false, resumo: error.message };

    const busca = str(args.busca)?.toLowerCase();
    const empresas = (data ?? [])
      .map((row) => {
        const d = (row.data ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          nome: (d.nome as string) ?? "",
          tipo: (d.tipo as string) ?? "",
          status: (d.status as string) ?? "",
          segmento: (d.segmento as string) ?? null,
        };
      })
      .filter((e) => (busca ? e.nome.toLowerCase().includes(busca) : true))
      .slice(0, limite);
    return { ok: true, resumo: `${empresas.length} empresa(s)`, data: empresas };
  },

  async listar_atividades(args, ctx) {
    let q = ctx.supabase
      .from("empresa_events")
      .select("id, empresa_id, occurred_at, data")
      .eq("workspace_id", ctx.workspaceId);
    const empresaId = str(args.empresa_id);
    if (empresaId) q = q.eq("empresa_id", empresaId);
    const limite = typeof args.limite === "number" ? Math.min(args.limite, 50) : 20;
    const { data, error } = await q.order("occurred_at", { ascending: false }).limit(limite);
    if (error) return { ok: false, resumo: error.message };
    const eventos = (data ?? []).map((row) => {
      const d = (row.data ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        empresa_id: row.empresa_id,
        occurred_at: row.occurred_at,
        tipo: d.tipo ?? null,
        titulo: d.titulo ?? null,
        descricao: d.descricao ?? null,
      };
    });
    return { ok: true, resumo: `${eventos.length} atividade(s)`, data: eventos };
  },

  async registrar_atividade(args, ctx) {
    const empresaId = str(args.empresa_id);
    const titulo = str(args.titulo);
    if (!empresaId || !titulo)
      return { ok: false, resumo: "empresa_id e titulo são obrigatórios." };
    const payload = {
      modulo: "empresas",
      tipo: "empresa.updated",
      titulo,
      descricao: str(args.descricao),
      created_by: ctx.userId,
      created_by_name: `${ctx.userName} (via Meu Agente)`,
    };
    const { data, error } = await ctx.supabase
      .from("empresa_events")
      .insert({
        workspace_id: ctx.workspaceId,
        empresa_id: empresaId,
        occurred_at: new Date().toISOString(),
        data: payload as unknown as Json,
      })
      .select("id, occurred_at")
      .single();
    if (error) return { ok: false, resumo: error.message };
    return { ok: true, resumo: `Atividade registrada: ${titulo}`, data };
  },

  async salvar_memoria(args, ctx) {
    const titulo = str(args.titulo);
    const conteudo = str(args.conteudo);
    if (!titulo || !conteudo) return { ok: false, resumo: "titulo e conteudo obrigatórios." };
    const categoria = str(args.categoria) ?? "contexto";
    const importancia =
      typeof args.importancia === "number" ? Math.min(Math.max(args.importancia, 1), 5) : 3;
    const { data, error } = await ctx.supabase
      .from("agent_memories")
      .insert({
        workspace_id: ctx.workspaceId,
        user_id: ctx.userId,
        titulo,
        conteudo,
        categoria,
        importancia,
        projeto: str(args.projeto) ?? null,
        empresa_id: str(args.empresa_id) ?? null,
        task_id: str(args.task_id) ?? null,
      })
      .select("id, titulo, categoria, importancia")
      .single();
    if (error) return { ok: false, resumo: error.message };
    return { ok: true, resumo: `Memória salva: ${titulo}`, data };
  },

  async listar_memorias(args, ctx) {
    let q = ctx.supabase
      .from("agent_memories")
      .select("id, titulo, conteudo, categoria, importancia, projeto, created_at")
      .eq("workspace_id", ctx.workspaceId)
      .eq("user_id", ctx.userId)
      .eq("arquivada", false);
    const projeto = str(args.projeto);
    if (projeto) q = q.ilike("projeto", `%${projeto}%`);
    const busca = str(args.busca);
    if (busca) q = q.or(`titulo.ilike.%${busca}%,conteudo.ilike.%${busca}%`);
    const limite = typeof args.limite === "number" ? Math.min(args.limite, 50) : 20;
    const { data, error } = await q
      .order("importancia", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) return { ok: false, resumo: error.message };
    return { ok: true, resumo: `${data?.length ?? 0} memória(s)`, data };
  },
};
