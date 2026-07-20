import { Activity, DollarSign, FolderKanban, LifeBuoy } from "lucide-react";
import type { ReactNode } from "react";

import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  EMPRESA_ORIGEM_LABEL,
  EMPRESA_STATUS_LABEL,
  EMPRESA_TIPO_LABEL,
  type Empresa,
} from "../empresas.types";

/**
 * Aba "Visão Geral" da página 360°.
 *
 * Exibe apenas dados do próprio cadastro (sem consultar outros módulos)
 * e cards placeholder que serão alimentados por eventos publicados por
 * CRM, Projetos, Financeiro e Suporte em sprints futuros.
 */
export function EmpresaOverview({ empresa }: { empresa: Empresa }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados principais</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome" value={empresa.nome} />
            <Field label="Tipo" value={EMPRESA_TIPO_LABEL[empresa.tipo]} />
            <Field label="Status" value={EMPRESA_STATUS_LABEL[empresa.status]} />
            <Field label="Origem" value={EMPRESA_ORIGEM_LABEL[empresa.origem]} />
            <Field label="Responsável" value={empresa.responsavel} />
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="empresa-metrics">
        <h2 id="empresa-metrics" className="sr-only">
          Indicadores da empresa
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Última interação"
            value="—"
            hint="Integração com CRM em breve"
            icon={<Activity className="h-4 w-4" />}
          />
          <KpiCard
            label="Projetos ativos"
            value="—"
            hint="Integração com Projetos em breve"
            icon={<FolderKanban className="h-4 w-4" />}
          />
          <KpiCard
            label="Financeiro"
            value="—"
            hint="Integração com Financeiro em breve"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KpiCard
            label="Chamados"
            value="—"
            hint="Integração com Suporte em breve"
            icon={<LifeBuoy className="h-4 w-4" />}
          />
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm">{value}</dd>
    </div>
  );
}
