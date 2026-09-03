/**
 * Endpoint de streaming do módulo "Meu Agente".
 *
 * - Autentica pelo Bearer token do usuário (RLS aplicada como o próprio usuário)
 * - Injeta contexto real do Growth (memórias + resumo operacional) no system prompt
 * - Expõe as ferramentas do agente (tarefas, projetos, empresas, atividades, memória)
 * - Persiste a mensagem do usuário e a resposta final em agent_messages
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  jsonSchema,
  streamText,
  tool,
  stepCountIs,
  type ToolSet,
  type UIMessage,
} from "ai";

import { AGENT_MODEL, createLovableGateway } from "@/lib/ai-gateway.server";
import { authenticateRequest } from "@/lib/supabase-request-auth.server";
import {
  AGENT_TOOLS,
  TOOL_EXECUTORS,
  type ToolContext,
} from "@/modules/agent/services/agent-tools.server";

type ChatBody = {
  messages?: UIMessage[];
  conversationId?: string;
};

type JsonSchemaInput = Parameters<typeof jsonSchema>[0];

/** A Responses API roda tools em modo estrito: tudo obrigatório e anulável. */
function toStrictSchema(parameters: Record<string, unknown>): JsonSchemaInput {
  const properties = (parameters.properties ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const strictProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const type = value.type as string | string[] | undefined;
    strictProps[key] = {
      ...value,
      type: Array.isArray(type) ? [...type, "null"] : [type ?? "string", "null"],
    };
  }
  return {
    type: "object",
    properties: strictProps,
    required: Object.keys(strictProps),
    additionalProperties: false,
  } as JsonSchemaInput;
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/agent/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Não autenticado.", { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("IA não configurada no servidor.", { status: 500 });
        }

        const body = (await request.json()) as ChatBody;
        const messages = body.messages;
        const conversationId = body.conversationId;
        if (!Array.isArray(messages) || !conversationId) {
          return new Response("messages e conversationId são obrigatórios.", {
            status: 400,
          });
        }

        const { supabase, userId } = auth;

        // Conversa precisa pertencer ao usuário (RLS já garante, validamos o 404).
        const { data: conversa } = await supabase
          .from("agent_conversations")
          .select("id, workspace_id, titulo")
          .eq("id", conversationId)
          .maybeSingle();
        if (!conversa) return new Response("Conversa não encontrada.", { status: 404 });

        const workspaceId = conversa.workspace_id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("id", userId)
          .maybeSingle();
        const userName = profile?.display_name ?? profile?.email ?? "Usuário";

        const ctx: ToolContext = { supabase, workspaceId, userId, userName };

        // Memória de longo prazo (curada pelo próprio agente).
        const { data: memorias } = await supabase
          .from("agent_memories")
          .select("categoria, titulo, conteudo, projeto")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .eq("arquivada", false)
          .order("importancia", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(25);

        const memoriaBloco =
          memorias && memorias.length > 0
            ? memorias
                .map(
                  (m) =>
                    `- [${m.categoria}]${m.projeto ? ` (${m.projeto})` : ""} ${m.titulo}: ${m.conteudo}`,
                )
                .join("\n")
            : "Nenhuma memória registrada ainda.";

        const hoje = new Date().toISOString().slice(0, 10);

        const system = [
          `Você é o "Meu Agente", assistente pessoal de trabalho dentro do Growth OS da Digiteyze.`,
          `Você ajuda ${userName} a administrar projetos, tarefas, empresas e atividades.`,
          `Data de hoje: ${hoje}.`,
          "",
          "Regras:",
          "- Responda sempre em português do Brasil, direto ao ponto, em markdown quando ajudar.",
          "- Use as ferramentas para consultar dados reais antes de afirmar qualquer coisa sobre tarefas, projetos ou empresas. Nunca invente dados.",
          "- Para criar ou atualizar algo, use a ferramenta correspondente e confirme o resultado ao usuário.",
          "- Use salvar_memoria apenas para informações duradouras (decisões, preferências, contexto de projeto, próximos passos). Nunca salve conversa trivial.",
          "- Se faltar um identificador (id de tarefa ou empresa), busque antes com a ferramenta de listagem.",
          "",
          "Memória de longo prazo do usuário:",
          memoriaBloco,
        ].join("\n");

        const tools: ToolSet = Object.fromEntries(
          AGENT_TOOLS.map((definition) => [
            definition.name,
            tool({
              description: definition.description,
              inputSchema: jsonSchema(toStrictSchema(definition.parameters)),
              execute: async (input) => {
                const executor = TOOL_EXECUTORS[definition.name];
                if (!executor) return { ok: false, resumo: "Ferramenta indisponível." };
                try {
                  return await executor((input ?? {}) as Record<string, unknown>, ctx);
                } catch (err) {
                  return {
                    ok: false,
                    resumo: err instanceof Error ? err.message : "Erro na ferramenta.",
                  };
                }
              },
            }),
          ]),
        );

        // Persiste a última mensagem do usuário antes de gerar a resposta.
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const content = textOf(lastUser);
          if (content) {
            const { error: insertError } = await supabase.from("agent_messages").insert({
              conversation_id: conversationId,
              workspace_id: workspaceId,
              user_id: userId,
              role: "user",
              content,
            });
            if (insertError) console.error("[agente] falha ao salvar mensagem", insertError);

            const patch: { updated_at: string; titulo?: string } = {
              updated_at: new Date().toISOString(),
            };
            if (conversa.titulo === "Nova conversa") {
              patch.titulo = content.slice(0, 60);
            }
            await supabase
              .from("agent_conversations")
              .update(patch)
              .eq("id", conversationId);
          }
        }

        const gateway = createLovableGateway(apiKey);

        const result = streamText({
          model: gateway.responses(AGENT_MODEL),
          system,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
          providerOptions: { openai: { store: false } },
          abortSignal: request.signal,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const content = textOf(responseMessage);
            const toolCalls = responseMessage.parts
              .filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool")
              .map((p) => {
                const part = p as unknown as {
                  type: string;
                  toolName?: string;
                  input?: unknown;
                  output?: { ok?: boolean; resumo?: string };
                };
                return {
                  name: part.toolName ?? part.type.replace(/^tool-/, ""),
                  arguments: (part.input ?? {}) as Record<string, unknown>,
                  ok: part.output?.ok ?? true,
                  resumo: part.output?.resumo ?? null,
                };
              });

            const { error } = await supabase.from("agent_messages").insert({
              conversation_id: conversationId,
              workspace_id: workspaceId,
              user_id: userId,
              role: "assistant",
              content,
              tool_calls: toolCalls,
            });
            if (error) console.error("[agente] falha ao salvar resposta", error);

            await supabase
              .from("agent_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
          },
        });
      },
    },
  },
});
