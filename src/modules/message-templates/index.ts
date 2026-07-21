export * from "./types/message-templates.types";
export {
  messageTemplateSchema,
  type MessageTemplateFormValues,
} from "./schemas/message-templates.schema";
export {
  applyVariables,
  buildVariableMap,
  extractTokens,
  type ApplyVariablesResult,
  type TemplateContext,
} from "./services/apply-variables";
export {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  setTemplateActive,
  deleteTemplate,
  listMyFavoriteTemplateIds,
  addFavorite,
  removeFavorite,
} from "./services/message-templates.service";
export {
  messageTemplatesKeys,
  messageTemplatesQueryOptions,
  useMessageTemplates,
  useMyFavoriteTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useSetTemplateActive,
  useDeleteTemplate,
  useToggleFavoriteTemplate,
} from "./hooks/use-message-templates";
export { TemplateFormDrawer } from "./components/template-form-drawer";
export { TemplatePickerDialog } from "./components/template-picker-dialog";
