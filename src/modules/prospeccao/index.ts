/**
 * Barrel público do módulo Prospecção.
 *
 * Consumidores externos (rotas, outros módulos) devem importar somente
 * a partir deste arquivo. Estruturas internas (services, helpers) não
 * são reexportadas.
 */

export * from "./types/leads.types";
export * from "./types/entities.types";

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
export { leadEventsKeys, leadEventsQueryOptions, useLeadEvents } from "./hooks/use-lead-events";
export {
  leadInteractionsKeys,
  leadInteractionsQueryOptions,
  useLeadInteractions,
  useCreateLeadInteraction,
} from "./hooks/use-lead-interactions";
export {
  leadTasksKeys,
  leadTasksQueryOptions,
  useLeadTasks,
  useCreateLeadTask,
  useUpdateLeadTaskStatus,
} from "./hooks/use-lead-tasks";
export { useConvertLead } from "./hooks/use-convert-lead";

export { LeadFormDrawer } from "./components/lead-form-drawer";
export { LeadsKanban } from "./components/leads-kanban";
export { LeadHeader } from "./components/lead-header";
export { LeadTabs } from "./components/lead-tabs";
export { LeadStatusMenu } from "./components/lead-status-menu";
export { LeadConvertDialog } from "./components/lead-convert-dialog";
export { LeadDetailSkeleton } from "./components/lead-detail-skeleton";
export { LeadOverview } from "./components/lead-overview";
export { LeadEventsTimeline } from "./components/lead-events-timeline";
export { InteractionList } from "./components/interaction-list";
export { InteractionForm } from "./components/interaction-form";
export { TaskList } from "./components/task-list";
export { TaskForm } from "./components/task-form";
