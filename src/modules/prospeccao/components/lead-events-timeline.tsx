import { Calendar, CheckCircle2, FileEdit, Mail, MessageCircle, PhoneCall, RefreshCcw, Sparkles, StickyNote } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";

import {
  LEAD_EVENT_TYPE_LABEL,
  type LeadEvent,
  type LeadEventType,
} from "../types/entities.types";
import {
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "../types/leads.types";

const EVENT_ICON: Record<LeadEventType, React.ComponentType<{ className?: string }>> = {
  created: Sparkles,
  status_changed: RefreshCcw,
  updated: FileEdit,
  converted: CheckCircle2,
  interaction_added: MessageCircle,
  task_added: Calendar,
  task_completed: CheckCircle2,
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function eventDetail(e: LeadEvent) {
  if (e.tipo === "status_changed") {
    const from = e.status_anterior ? LEAD_STATUS_LABEL[e.status_anterior as LeadStatus] : "—";
    const to = e.status_novo ? LEAD_STATUS_LABEL[e.status_novo as LeadStatus] : "—";
    return `${from} → ${to}`;
  }
  return e.descricao ?? "";
}

export function LeadEventsTimeline({ events }: { events: LeadEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Sem eventos ainda"
        description="Ações como criação, mudança de estágio e conversão aparecerão aqui."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ol className="divide-y">
          {events.map((e) => {
            const Icon = EVENT_ICON[e.tipo] ?? StickyNote;
            return (
              <li key={e.id} className="flex gap-3 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {LEAD_EVENT_TYPE_LABEL[e.tipo]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDateTime(e.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{eventDetail(e)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// Not currently used; kept to signal the icon set is intentional
void PhoneCall;
void Mail;
