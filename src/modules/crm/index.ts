/**
 * Barrel público do módulo CRM.
 *
 * Consumidores externos (rotas, outros módulos) devem importar somente
 * a partir deste arquivo.
 */

// --- Oportunidades ---
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
export { OpportunityHeader } from "./components/opportunity-header";
export { OpportunityTabs } from "./components/opportunity-tabs";
export { OpportunityOverview } from "./components/opportunity-overview";
export { OpportunityTimeline } from "./components/opportunity-timeline";
export { EmpresaCrmSection } from "./components/empresa-crm-section";

// --- Propostas ---
export * from "./types/proposals.types";
export {
  proposalSchema,
  proposalItemSchema,
  type ProposalFormValues,
  type ProposalItemFormValues,
} from "./schemas/proposals.schema";
export {
  proposalsKeys,
  proposalsQueryOptions,
  proposalsByOpportunityQueryOptions,
  proposalsByEmpresaQueryOptions,
  proposalQueryOptions,
  useProposals,
  useProposalsByOpportunity,
  useProposalsByEmpresa,
  useProposal,
  useCreateProposal,
  useUpdateProposal,
  useTransitionProposalStatus,
  useDuplicateProposal,
  useDeleteProposal,
  computeProposalKpis,
} from "./hooks/use-proposals";
export { ProposalFormDrawer } from "./components/proposal-form-drawer";
export { ProposalCard } from "./components/proposal-card";
export { ProposalList } from "./components/proposal-list";
export { ProposalStatusBadge } from "./components/proposal-status-badge";
export { EmpresaProposalsSummary } from "./components/empresa-proposals-summary";


