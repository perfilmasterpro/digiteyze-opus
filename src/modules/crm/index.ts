/**
 * Barrel público do módulo CRM.
 *
 * Consumidores externos (rotas, outros módulos) devem importar somente
 * a partir deste arquivo.
 */

export * from "./types/opportunities.types";

export {
  opportunitySchema,
  type OpportunityFormValues,
} from "./schemas/opportunities.schema";

export {
  opportunitiesKeys,
  opportunitiesQueryOptions,
  opportunitiesByEmpresaQueryOptions,
  opportunityQueryOptions,
  useOpportunities,
  useOpportunitiesByEmpresa,
  useOpportunity,
  useCreateOpportunity,
  useUpdateOpportunity,
  useUpdateOpportunityStatus,
  useDeleteOpportunity,
  computeOpportunityKpis,
} from "./hooks/use-opportunities";

export { OpportunityFormDrawer } from "./components/opportunity-form-drawer";
export { OpportunitiesKanban } from "./components/opportunities-kanban";
