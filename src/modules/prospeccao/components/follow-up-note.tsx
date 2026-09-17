import { CalendarClock } from "lucide-react";

export function FollowUpNote() {
  return (
    <div className="flex gap-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong className="text-foreground">Próximo passo:</strong> depois de cada contato, deixe uma próxima ação e uma data. Assim o Lead aparece automaticamente no Follow-up e também pode virar uma tarefa.
      </p>
    </div>
  );
}
