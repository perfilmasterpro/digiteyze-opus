import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  Handshake,
  History,
  Sparkles,
  Target,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_LABEL,
  useLead,
  type LeadStatus,
} from "@/modules/prospeccao";

import { useEmpresaEvents } from "../use-empresa-events";
import {
  EMPRESA_EVENT_TYPE_LABEL,
  type EmpresaEvent,
} from "../services/empresa-events.service";
import type { Empresa } from "../empresas.types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  novo_lead: "neutral",
  primeiro_contato: "info",
  whatsapp: "info",
  respondeu: "primary",
  reuniao: "primary",
  proposta: "warning",
  negociacao: "warning",
  cliente: "success",
  perdido: "destructive",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

/**
 * Aba Comercial da empresa 360°.
 *
 * Mostra:
 *  - "Origem comercial" — lead que originou a empresa (link para ficha do lead).
 *  - "Resumo comercial" — cards placeholder que serão populados por eventos
 *    de CRM/Prospecção quando o módulo CRM for implementado.
 *
 * Consome o módulo Prospecção somente via seu barrel público (`@/modules/prospeccao`).
 */
export function EmpresaComercial({ empresa }: { empresa: Empresa }) {
  const leadId = empresa.lead_origem_id;
  const { data: lead } = useLead(leadId ?? "");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4" />
            Origem comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!leadId ? (
            <EmptyState
              icon={<Target className="h-5 w-5" />}
              title="Sem origem no funil"
              description="Esta empresa não foi criada a partir de um lead de Prospecção."
            />
          ) : !lead ? (
            <p className="text-sm text-muted-foreground">
              O lead de origem não está mais disponível (id: <code>{leadId}</code>).
            </p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 space-y-1">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Lead de origem
                </dt>
                <dd className="text-sm">
                  <Link
                    to="/prospeccao/$id"
                    params={{ id: lead.id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {lead.nome_empresa}
                  </Link>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Estágio final
                </dt>
                <dd>
                  <StatusBadge tone={STATUS_TONE[lead.status]}>
                    {LEAD_STATUS_LABEL[lead.status]}
                  </StatusBadge>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Data de conversão
                </dt>
                <dd className="inline-flex items-center gap-1 text-sm">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {fmtDate(empresa.data_conversao)}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Valor negociado
                </dt>
                <dd className="text-sm font-medium">
                  {typeof lead.valor_potencial === "number"
                    ? currency.format(lead.valor_potencial)
                    : "—"}
                </dd>
              </div>
              {lead.temperatura ? (
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Temperatura
                  </dt>
                  <dd className="text-sm">{LEAD_TEMPERATURA_LABEL[lead.temperatura]}</dd>
                </div>
              ) : null}
              {lead.responsavel ? (
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Responsável comercial
                  </dt>
                  <dd className="text-sm">{lead.responsavel}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="empresa-comercial-resumo">
        <h2 id="empresa-comercial-resumo" className="sr-only">
          Resumo comercial
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            label="Oportunidades"
            value="—"
            hint="Integração com CRM em breve"
            icon={<Handshake className="h-4 w-4" />}
          />
          <KpiCard
            label="Último contato"
            value="—"
            hint="Integração com CRM em breve"
            icon={<Sparkles className="h-4 w-4" />}
          />
          <KpiCard
            label="Próxima ação"
            value="—"
            hint="Integração com CRM em breve"
            icon={<BarChart3 className="h-4 w-4" />}
          />
        </div>
      </section>
    </div>
  );
}
