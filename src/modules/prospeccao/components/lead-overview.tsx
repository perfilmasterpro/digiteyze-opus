import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Mail,
  MapPin,
  MessageSquarePlus,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  LEAD_CANAL_LABEL,
  LEAD_MOTIVO_PERDA_LABEL,
  LEAD_ORIGEM_LABEL,
  LEAD_PORTE_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURA_LABEL,
  type Lead,
} from "../types/leads.types";
import { QuickContactActions } from "./quick-contact-actions";
import { LeadCadenceBlock } from "@/modules/cadences";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Extrai campos derivados salvos em `observacoes` pelo importador
 * Google Maps (Thunderbit). Mantém retrocompatibilidade sem exigir
 * novas colunas no schema Lead.
 */
function parseObservacoes(text?: string): {
  endereco?: string;
  bairro?: string;
  googleMapsUrl?: string;
  avaliacao?: string;
  restNotes?: string;
} {
  if (!text) return {};
  const lines = text.split(/\r?\n/);
  const extras: ReturnType<typeof parseObservacoes> = {};
  const rest: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-zÀ-ú°º ]+):\s*(.+)\s*$/);
    if (!match) {
      rest.push(line);
      continue;
    }
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "endereço" || key === "endereco") extras.endereco = value;
    else if (key === "bairro") extras.bairro = value;
    else if (key === "google maps") extras.googleMapsUrl = value;
    else if (key === "avaliação google" || key === "avaliacao google")
      extras.avaliacao = value;
    else rest.push(line);
  }
  extras.restNotes = rest.join("\n").trim() || undefined;
  return extras;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children ?? "—"}</dd>
    </div>
  );
}

export function LeadOverview({ lead }: { lead: Lead }) {
  const extras = parseObservacoes(lead.observacoes);
  const cidadeUf = [lead.cidade, lead.estado].filter(Boolean).join(" / ");
  const mapsQuery = [lead.nome_empresa, extras.endereco || cidadeUf]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Coluna 1 — Empresa + Comercial */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Dados da empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome">{lead.nome_empresa}</Field>
              <Field label="Segmento">{lead.segmento || "—"}</Field>
              <Field label="Cidade / UF">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {cidadeUf || "—"}
                </span>
              </Field>
              <Field label="Endereço">
                {extras.endereco || "—"}
                {extras.bairro ? (
                  <span className="text-muted-foreground"> · {extras.bairro}</span>
                ) : null}
              </Field>
              <Field label="CNPJ">{lead.cnpj || "—"}</Field>
              <Field label="Porte">
                {lead.porte ? LEAD_PORTE_LABEL[lead.porte] : "—"}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados comerciais</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Field label="Origem">{LEAD_ORIGEM_LABEL[lead.origem]}</Field>
              <Field label="Responsável">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {lead.responsavel}
                </span>
              </Field>
              <Field label="Status do pipeline">
                {LEAD_STATUS_LABEL[lead.status]}
              </Field>
              <Field label="Temperatura">
                {lead.temperatura ? LEAD_TEMPERATURA_LABEL[lead.temperatura] : "—"}
              </Field>
              <Field label="Canal de aquisição">
                {lead.canal_aquisicao ? LEAD_CANAL_LABEL[lead.canal_aquisicao] : "—"}
              </Field>
              <Field label="Probabilidade">
                {typeof lead.probabilidade_fechamento === "number"
                  ? `${lead.probabilidade_fechamento}%`
                  : "—"}
              </Field>
              <Field label="Valor potencial">
                {typeof lead.valor_potencial === "number"
                  ? currency.format(lead.valor_potencial)
                  : "—"}
              </Field>
              <Field label="Data de criação">{fmtDate(lead.created_at)}</Field>
              <Field label="Última interação">{fmtDateTime(lead.updated_at)}</Field>
              <Field label="Próxima ação">{lead.proxima_acao || "—"}</Field>
              <Field label="Data prevista">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {fmtDate(lead.data_proxima_acao)}
                </span>
              </Field>
              {lead.contato_email ? (
                <Field label="E-mail do contato">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    <a
                      href={`mailto:${lead.contato_email}`}
                      className="text-primary hover:underline"
                    >
                      {lead.contato_email}
                    </a>
                  </span>
                </Field>
              ) : null}
              {lead.contato_nome ? (
                <Field label="Contato">
                  {lead.contato_nome}
                  {lead.contato_cargo ? (
                    <span className="text-muted-foreground"> · {lead.contato_cargo}</span>
                  ) : null}
                </Field>
              ) : null}
              {lead.status === "perdido" && lead.motivo_perda ? (
                <Field label="Motivo de perda">
                  {LEAD_MOTIVO_PERDA_LABEL[lead.motivo_perda]}
                </Field>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        {extras.restNotes || extras.avaliacao ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {extras.avaliacao ? (
                <p>
                  <span className="text-xs uppercase tracking-wider">
                    Avaliação Google:{" "}
                  </span>
                  <span className="text-foreground">{extras.avaliacao}</span>
                </p>
              ) : null}
              {extras.restNotes ? (
                <p className="whitespace-pre-wrap">{extras.restNotes}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campos personalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {Object.entries(lead.custom_fields).map(([key, value]) => (
                  <Field key={key} label={key}>
                    {value}
                  </Field>
                ))}
              </dl>
            </CardContent>
          </Card>
        ) : null}
      </div>


      {/* Coluna 2 — Ações rápidas */}
      <div className="space-y-4">
        <QuickContactActions
          telefone={lead.telefone}
          whatsapp={lead.whatsapp}
          instagram={lead.instagram}
          site={lead.site}
          googleMapsUrl={extras.googleMapsUrl}
          mapsFallbackQuery={mapsQuery || undefined}
        />

        <LeadCadenceBlock leadId={lead.id} />


        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" size="sm" className="justify-start gap-2">
              <Link to="/prospeccao/$id/interacoes" params={{ id: lead.id }}>
                <MessageSquarePlus className="h-4 w-4" />
                Registrar contato
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start gap-2">
              <Link to="/prospeccao/$id/proximas-acoes" params={{ id: lead.id }}>
                <CalendarPlus className="h-4 w-4" />
                Criar tarefa de retorno
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start gap-2">
              <Link to="/prospeccao/$id/historico" params={{ id: lead.id }}>
                <ClipboardList className="h-4 w-4" />
                Ver histórico
              </Link>
            </Button>
            <p className="pt-1 text-xs text-muted-foreground">
              Para alterar a etapa do pipeline, use{" "}
              <span className="font-medium text-foreground">Alterar estágio</span>{" "}
              no topo da ficha.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
