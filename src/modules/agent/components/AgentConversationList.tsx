/** Histórico de conversas do agente. */

import { MessageSquare, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AgentConversation } from "../types/agent.types";

type Props = {
  conversations: AgentConversation[];
  activeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export function AgentConversationList({
  conversations,
  activeId,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-3">
        <Button className="w-full" onClick={onCreate} disabled={loading}>
          <Plus /> Nova conversa
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa ainda.
            </p>
          )}
          {conversations.map((conversa) => (
            <div
              key={conversa.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                conversa.id === activeId && "bg-accent",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(conversa.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{conversa.titulo}</span>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Excluir conversa"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => onDelete(conversa.id)}
              >
                <Trash2 className="text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
