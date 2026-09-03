import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { AgentChat } from "@/modules/agent/components/AgentChat";
import { AgentConversationList } from "@/modules/agent/components/AgentConversationList";
import { AgentMemoryPanel } from "@/modules/agent/components/AgentMemoryPanel";
import {
  useAgentConversations,
  useCreateConversation,
  useDeleteConversation,
} from "@/modules/agent/hooks/use-agent";

export const Route = createFileRoute("/agente")({
  head: () => ({
    meta: [
      { title: "Meu Agente IA — Growth OS" },
      {
        name: "description",
        content:
          "Agente pessoal de IA do Growth OS: consulte projetos, tarefas e empresas, crie tarefas e registre atividades por conversa.",
      },
      { property: "og:title", content: "Meu Agente IA — Growth OS" },
      {
        property: "og:description",
        content:
          "Assistente de IA integrado ao Growth OS para administrar projetos, tarefas e empresas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentePage,
});

function AgentePage() {
  const { data: conversations = [], isLoading } = useAgentConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  function handleCreate() {
    createConversation.mutate(undefined, {
      onSuccess: (conversa) => setActiveId(conversa.id),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleDelete(id: string) {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (activeId === id) setActiveId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Meu Agente"
        description="Seu assistente de IA para projetos, tarefas e empresas."
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <div className="hidden min-h-0 rounded-lg border lg:block">
          <AgentConversationList
            conversations={conversations}
            activeId={activeId}
            loading={isLoading || createConversation.isPending}
            onSelect={setActiveId}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
        </div>

        <div className="min-h-0 rounded-lg border">
          {activeId ? (
            <AgentChat conversationId={activeId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Comece uma conversa com o seu agente.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Nova conversa
              </button>
            </div>
          )}
        </div>

        <div className="hidden min-h-0 rounded-lg border lg:block">
          <AgentMemoryPanel />
        </div>
      </div>
    </div>
  );
}
