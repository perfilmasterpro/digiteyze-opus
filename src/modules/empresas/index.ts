/**
 * Barrel público do módulo Empresas.
 *
 * Consumidores externos (rotas, outros módulos) devem importar somente
 * a partir deste arquivo. Componentes internos e detalhes de persistência
 * não são reexportados.
 */

export type {
  Empresa,
  EmpresaInput,
  EmpresaOrigem,
  EmpresaStatus,
  EmpresaTipo,
} from "./empresas.types";

export {
  EMPRESA_ORIGENS,
  EMPRESA_ORIGEM_LABEL,
  EMPRESA_STATUS,
  EMPRESA_STATUS_LABEL,
  EMPRESA_TIPOS,
  EMPRESA_TIPO_LABEL,
} from "./empresas.types";

export {
  createEmpresa,
  getEmpresa,
  listEmpresas,
} from "./empresas.service";

export {
  empresasKeys,
  empresasQueryOptions,
  empresaQueryOptions,
  useEmpresa,
  useEmpresas,
  useCreateEmpresa,
} from "./use-empresas";

export type {
  EmpresaEvent,
  EmpresaEventModule,
  EmpresaEventType,
  PublishEmpresaEventInput,
} from "./services/empresa-events.service";
export {
  EMPRESA_EVENT_MODULES,
  EMPRESA_EVENT_MODULE_LABEL,
  EMPRESA_EVENT_TYPES,
  EMPRESA_EVENT_TYPE_LABEL,
  listEmpresaEvents,
  publishEmpresaEvent,
} from "./services/empresa-events.service";
export {
  empresaEventsKeys,
  empresaEventsQueryOptions,
  useEmpresaEvents,
} from "./use-empresa-events";

export { EmpresaComercial } from "./components/empresa-comercial";
export { EmpresaTimeline } from "./components/empresa-timeline";
