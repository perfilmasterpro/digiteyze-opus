/** Chat do "Meu Agente" — AI Elements + streaming autenticado. */

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import agentLogo from "@/assets/agent-logo.png";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { supabase } from "@/integrations/supabase/client";
import { agentKeys, useAgentMessages } from "../hooks/use-agent";

type Props = { conversationId: string };

export function AgentChat({ conversationId }: Props) {
  const queryClient = useQueryClient();
  const { data: history, isLoading } = useAgentMessages(conversationId);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      (history ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: m.content }],
        })),
    [history],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          return {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session?.access_token ?? ""}`,
            },
            body: { messages, conversationId },
          };
        },
      }),
    [conversationId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "Falha ao falar com o agente."),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.memories });
      queryClient.invalidateQueries({ queryKey: agentKeys.context });
      queryClient.invalidateQueries({ queryKey: agentKeys.conversations });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, conversationId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const textarea = form.querySelector("textarea");
    const text = textarea?.value.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    if (textarea) textarea.value = "";
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {isLoading ? (
            <Shimmer>Carregando conversa...</Shimmer>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <img
                src={agentLogo}
                alt="Meu Agente"
                width={512}
                height={512}
                loading="lazy"
                className="h-16 w-16"
              />
              <div>
                <p className="text-base font-medium">Como posso ajudar hoje?</p>
                <p className="text-sm text-muted-foreground">
                  Pergunte sobre projetos, tarefas e empresas — ou peça para eu criar
                  algo.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-t-${index}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    }
                    if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                      const toolPart = part as unknown as {
                        type: string;
                        toolName?: string;
                        state: string;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={`${message.id}-tool-${index}`} defaultOpen={false}>
                          <ToolHeader
                            type={
                              (toolPart.toolName ??
                                toolPart.type.replace(/^tool-/, "")) as `tool-${string}`
                            }
                            state={toolPart.state as never}
                          />
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            <ToolOutput
                              output={toolPart.output}
                              errorText={toolPart.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer>Pensando...</Shimmer>}
          {error && (
            <p className="text-sm text-destructive">
              {error.message || "Erro ao contatar o agente."}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            placeholder="Pergunte sobre suas tarefas, projetos ou empresas..."
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
