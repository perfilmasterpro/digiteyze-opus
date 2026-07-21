/**
 * Tipos do submódulo CRM — Assinaturas de Contrato.
 *
 * Cada `Signature` está vinculada a um `Contract` (`contract_id`) e — por
 * conveniência (denormalizado) — à `Empresa`. Preparado para futura
 * integração com provedores de assinatura digital (Clicksign, DocuSign,
 * ICP-Brasil), sem implementá-la nesta fase.
 */

export const SIGNATURE_STATUS = [
  "pendente",
  "enviado",
  "visualizado",
  "assinado",
  "recusado",
  "expirado",
] as const;
export type SignatureStatus = (typeof SIGNATURE_STATUS)[number];

export const SIGNATURE_STATUS_LABEL: Record<SignatureStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  visualizado: "Visualizado",
  assinado: "Assinado",
  recusado: "Recusado",
  expirado: "Expirado",
};

export const SIGNATURE_OPEN_STATUSES: readonly SignatureStatus[] = [
  "pendente",
  "enviado",
  "visualizado",
];

export interface Signature {
  id: string;
  workspace_id: string;
  contract_id: string;
  empresa_id: string;
  status: SignatureStatus;
  signer_name: string;
  signer_email: string;
  signed_at?: string; // ISO
  created_at: string;
  updated_at: string;
}

export type SignatureInput = Omit<
  Signature,
  "id" | "workspace_id" | "created_at" | "updated_at"
>;
