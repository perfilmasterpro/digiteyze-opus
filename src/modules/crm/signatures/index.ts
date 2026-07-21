/**
 * Barrel público do submódulo CRM > Assinaturas.
 *
 * Consumidores externos importam somente daqui — nunca de arquivos internos.
 */

export * from "./types/signatures.types";
export {
  signatureSchema,
  type SignatureFormValues,
} from "./schemas/signatures.schema";
export {
  signatureKeys,
  signaturesQueryOptions,
  signaturesByContractQueryOptions,
  signaturesByEmpresaQueryOptions,
  signatureQueryOptions,
  useSignatures,
  useSignature,
  useSignaturesByContract,
  useSignaturesByEmpresa,
  useCreateSignature,
  useUpdateSignatureStatus,
  useDeleteSignature,
  computeSignatureKpis,
} from "./hooks/use-signatures";
export { SignatureStatusBadge } from "./components/signature-status-badge";
export { SignatureRequestDialog } from "./components/signature-request-dialog";
export { EmpresaSignaturesSummary } from "./components/empresa-signatures-summary";
