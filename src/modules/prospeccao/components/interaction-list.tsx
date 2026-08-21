import { Mail, MessageCircle, PhoneCall, StickyNote, Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";

import {
  LEAD_INTERACTION_TYPE_LABEL,
  type LeadInteraction,
  type LeadInteractionType,
} from "../types/entities.types";

const ICON: Record<LeadInteractionType, React.ComponentType<{ className?: string }>> = {
  ligacao: PhoneCall,
  whatsapp: MessageCircle,
  email: Mail,
  reuniao: Users,
  nota: StickyNote,
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function InteractionList({ items }: { items: LeadInteraction[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma interação registrada"
        description="Registre ligações, mensagens, e-mails, reuniões e notas para manter o histórico."
      />
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ol className="divide-y">
          {items.map((i) => {
            const Icon = ICON[i.tipo];
            return (
              <li key={i.id} className="flex gap-3 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {LEAD_INTERACTION_TYPE_LABEL[i.tipo]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmt(i.data_json?.timestamp_whatsapp || i.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                    {i.data_json?.mensagem || i.descricao}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
