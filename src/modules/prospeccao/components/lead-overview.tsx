import { Building2, CalendarClock, Mail, MapPin, Phone, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  LEAD_CANAL_LABEL,
  LEAD_MOTIVO_PERDA_LABEL,
  LEAD_ORIGEM_LABEL,
  LEAD_PORTE_LABEL,
  LEAD_TEMPERATURA_LABEL,
  type Lead,
} from "../types/leads.types";

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children ?? "—"}</dd>
    </div>
  );
}

export function LeadOverview({ lead }: { lead: Lead }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="CNPJ">{lead.cnpj || "—"}</Field>
            <Field label="Segmento">{lead.segmento || "—"}</Field>
            <Field label="Porte">{lead.porte ? LEAD_PORTE_LABEL[lead.porte] : "—"}</Field>
            <Field label="Origem">{LEAD_ORIGEM_LABEL[lead.origem]}</Field>
            <Field label="Cidade / UF">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {[lead.cidade, lead.estado].filter(Boolean).join(" / ") || "—"}
              </span>
            </Field>
            <Field label="Site">
              {lead.site ? (
                <a
                  href={lead.site}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {lead.site}
                </a>
              ) : (
                "—"
              )}
            </Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Contato principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">{lead.contato_nome || "—"}</Field>
            <Field label="Cargo">{lead.contato_cargo || "—"}</Field>
            <Field label="E-mail">
              {lead.contato_email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${lead.contato_email}`} className="text-primary hover:underline">
                    {lead.contato_email}
                  </a>
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Telefone">
              {lead.telefone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {lead.telefone}
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="WhatsApp">{lead.whatsapp || "—"}</Field>
            <Field label="Instagram">{lead.instagram || "—"}</Field>
          </dl>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comercial</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-4">
            <Field label="Temperatura">
              {lead.temperatura ? LEAD_TEMPERATURA_LABEL[lead.temperatura] : "—"}
            </Field>
            <Field label="Valor potencial">
              {typeof lead.valor_potencial === "number"
                ? currency.format(lead.valor_potencial)
                : "—"}
            </Field>
            <Field label="Canal de aquisição">
              {lead.canal_aquisicao ? LEAD_CANAL_LABEL[lead.canal_aquisicao] : "—"}
            </Field>
            <Field label="Probabilidade">
              {typeof lead.probabilidade_fechamento === "number"
                ? `${lead.probabilidade_fechamento}%`
                : "—"}
            </Field>
            <Field label="Próxima ação">{lead.proxima_acao || "—"}</Field>
            <Field label="Data prevista">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {fmtDate(lead.data_proxima_acao)}
              </span>
            </Field>
            {lead.status === "perdido" ? (
              <Field label="Motivo de perda">
                {lead.motivo_perda ? LEAD_MOTIVO_PERDA_LABEL[lead.motivo_perda] : "—"}
              </Field>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {lead.observacoes ? (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {lead.observacoes}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
