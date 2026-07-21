import { z } from "zod";

import { SIGNATURE_STATUS } from "../types/signatures.types";

export const signatureSchema = z.object({
  contract_id: z.string().min(1),
  empresa_id: z.string().min(1),
  status: z.enum(SIGNATURE_STATUS),
  signer_name: z.string().min(2, "Nome muito curto").max(160),
  signer_email: z.string().email("E-mail inválido").max(200),
  signed_at: z.string().optional().or(z.literal("")),
});

export type SignatureFormValues = z.infer<typeof signatureSchema>;
