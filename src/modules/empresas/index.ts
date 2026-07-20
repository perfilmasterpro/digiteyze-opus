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
