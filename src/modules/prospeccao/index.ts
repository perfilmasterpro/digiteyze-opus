/**
 * Barrel público do módulo Prospecção.
 *
 * Consumidores externos (rotas, outros módulos) devem importar somente
 * a partir deste arquivo. Estruturas internas (services, helpers) não
 * são reexportadas.
 */

export * from "./types/leads.types";
export { leadSchema, type LeadFormValues } from "./schemas/leads.schema";
export {
  leadsKeys,
  leadsQueryOptions,
  leadQueryOptions,
  useLeads,
  useLead,
  useCreateLead,
  useUpdateLead,
  useUpdateLeadStatus,
} from "./hooks/use-leads";
export { LeadFormDrawer } from "./components/lead-form-drawer";
export { LeadsKanban } from "./components/leads-kanban";
