import { Construction } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "./page-header";

type ModulePlaceholderProps = {
  title: string;
  icon?: LucideIcon;
  summary?: string;
  planned?: string[];
};

export function ModulePlaceholder({
  title,
  icon: Icon,
  summary,
  planned,
}: ModulePlaceholderProps) {
  return (
    <div>
      <PageHeader
        title={title}
        icon={Icon ? <Icon className="h-5 w-5" /> : undefined}
        description={summary ?? "Módulo em preparação. A estrutura da rota já existe."}
      />

      <div className="rounded-xl border border-dashed bg-muted/30 p-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-background text-primary shadow-sm">
            <Construction className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Em desenvolvimento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta rota está reservada. As funcionalidades deste módulo serão
            implementadas nas próximas fases, seguindo o design system definido na Fase 0.
          </p>

          {planned && planned.length > 0 ? (
            <div className="mt-6 w-full rounded-lg border bg-background p-4 text-left">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Planejado
              </p>
              <ul className="space-y-1.5 text-sm">
                {planned.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
