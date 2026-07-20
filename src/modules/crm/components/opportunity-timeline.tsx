import { useMemo } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { EmpresaTimeline, useEmpresaEvents } from "@/modules/empresas";

import type { Opportunity } from "../types/opportunities.types";

/**
 * Timeline da oportunidade — reutiliza o EmpresaTimeline filtrando os
 * eventos cujo `payload.opportunity_id` corresponde à oportunidade atual.
 * Também inclui eventos gerais da empresa marcados diretamente com esta
 * oportunidade nos payloads (created/updated/won/lost/proposal.*).
 */
export function OpportunityTimeline({ opportunity }: { opportunity: Opportunity }) {
  const { data, isLoading } = useEmpresaEvents(opportunity.empresa_id);

  const events = useMemo(
    () =>
      (data ?? []).filter((e) => {
        const oppId = (e.payload as { opportunity_id?: string } | undefined)?.opportunity_id;
        return oppId === opportunity.id;
      }),
    [data, opportunity.id],
  );

  if (isLoading) return <LoadingState label="Carregando eventos…" />;
  if (events.length === 0) {
    return (
      <EmptyState
        title="Sem eventos ainda"
        description="Movimentações desta oportunidade (criação, mudanças de estágio, propostas) aparecerão aqui."
      />
    );
  }

  return <EmpresaTimeline events={events} />;
}
