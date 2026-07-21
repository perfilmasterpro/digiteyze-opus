import { useMemo } from "react";
import { CalendarClock, Mail, Phone, User } from "lucide-react";

import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  LEAD_ORIGEM_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_DOT,
  LEAD_TEMPERATURA_LABEL,
  type Lead,
  type LeadStatus,
} from "../types/leads.types";

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo_lead: "info",
  primeiro_contato: "info",
  whatsapp: "info",
  respondeu: "warning",
  reuniao: "warning",
  proposta: "warning",
  negociacao: "warning",
  cliente: "success",
  perdido: "destructive",
};

function fmt(d?: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function LeadsTable({
  leads,
  onSelect,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  const rows = useMemo(() => leads, [leads]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nenhum lead nos filtros atuais"
        description="Ajuste os filtros ou cadastre novos leads."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left">Contato</th>
                <th className="px-3 py-2 text-left">Cidade/UF</th>
                <th className="px-3 py-2 text-left">Origem</th>
                <th className="px-3 py-2 text-left">Temperatura</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Próxima ação</th>
                <th className="px-3 py-2 text-left">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => onSelect(l)}
                  className="cursor-pointer border-t transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {l.nome_empresa}
                    {l.segmento ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {l.segmento}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {l.contato_nome ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <User className="h-3 w-3" /> {l.contato_nome}
                        </span>
                      ) : null}
                      {l.telefone || l.whatsapp ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {l.telefone ?? l.whatsapp}
                        </span>
                      ) : null}
                      {l.contato_email ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {l.contato_email}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {[l.cidade, l.estado].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {LEAD_ORIGEM_LABEL[l.origem]}
                  </td>
                  <td className="px-3 py-2.5">
                    {l.temperatura ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            LEAD_TEMPERATURA_DOT[l.temperatura],
                          )}
                        />
                        {LEAD_TEMPERATURA_LABEL[l.temperatura]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={STATUS_TONE[l.status]}>
                      {LEAD_STATUS_LABEL[l.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {fmt(l.data_proxima_acao)}
                    </div>
                    {l.proxima_acao ? (
                      <div className="truncate text-foreground">{l.proxima_acao}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {l.responsavel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
