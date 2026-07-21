import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  empresaEventsKeys,
  publishEmpresaEvent,
  type EmpresaEventType,
} from "@/modules/empresas";
import {
  getCurrentUserName,
  useCurrentUserId,
  useCurrentWorkspaceId,
} from "@/lib/workspace";

import {
  createSignature,
  deleteSignature,
  getSignature,
  listSignatures,
  updateSignatureStatus,
} from "../services/signatures.service";
import {
  SIGNATURE_STATUS_LABEL,
  type Signature,
  type SignatureInput,
  type SignatureStatus,
} from "../types/signatures.types";

export const signatureKeys = {
  all: (workspaceId: string) => ["signatures", workspaceId] as const,
  byContract: (workspaceId: string, contractId: string) =>
    ["signatures", workspaceId, "contract", contractId] as const,
  byEmpresa: (workspaceId: string, empresaId: string) =>
    ["signatures", workspaceId, "empresa", empresaId] as const,
  detail: (workspaceId: string, id: string) =>
    ["signature", workspaceId, id] as const,
};

const DEFAULT_STALE_TIME = 30_000;

export function signaturesQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: signatureKeys.all(workspaceId),
    queryFn: () => listSignatures(workspaceId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function signaturesByContractQueryOptions(
  workspaceId: string,
  contractId: string,
) {
  return queryOptions({
    queryKey: signatureKeys.byContract(workspaceId, contractId),
    queryFn: () => listSignatures(workspaceId, { contractId }),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function signaturesByEmpresaQueryOptions(
  workspaceId: string,
  empresaId: string,
) {
  return queryOptions({
    queryKey: signatureKeys.byEmpresa(workspaceId, empresaId),
    queryFn: () => listSignatures(workspaceId, { empresaId }),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function signatureQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: signatureKeys.detail(workspaceId, id),
    queryFn: () => getSignature(workspaceId, id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSignatures() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(signaturesQueryOptions(workspaceId));
}

export function useSignaturesByContract(contractId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...signaturesByContractQueryOptions(workspaceId, contractId),
    enabled: Boolean(contractId),
  });
}

export function useSignaturesByEmpresa(empresaId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...signaturesByEmpresaQueryOptions(workspaceId, empresaId),
    enabled: Boolean(empresaId),
  });
}

export function useSignature(id: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...signatureQueryOptions(workspaceId, id),
    enabled: Boolean(id),
  });
}

function useInvalidateSignatures() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return (opts: { contractId?: string; empresaId?: string; id?: string }) => {
    qc.invalidateQueries({ queryKey: signatureKeys.all(workspaceId) });
    if (opts.contractId) {
      qc.invalidateQueries({
        queryKey: signatureKeys.byContract(workspaceId, opts.contractId),
      });
    }
    if (opts.empresaId) {
      qc.invalidateQueries({
        queryKey: signatureKeys.byEmpresa(workspaceId, opts.empresaId),
      });
      qc.invalidateQueries({
        queryKey: empresaEventsKeys.all(workspaceId, opts.empresaId),
      });
    }
    if (opts.id) {
      qc.invalidateQueries({
        queryKey: signatureKeys.detail(workspaceId, opts.id),
      });
    }
  };
}

async function publish(
  workspaceId: string,
  signature: Signature,
  tipo: EmpresaEventType,
  titulo: string,
  createdBy: string,
  descricao?: string,
) {
  await publishEmpresaEvent({
    workspaceId,
    empresaId: signature.empresa_id,
    modulo: "comercial",
    tipo,
    titulo,
    descricao,
    createdBy,
    createdByName: getCurrentUserName(),
    payload: {
      signature_id: signature.id,
      contract_id: signature.contract_id,
      status: signature.status,
      signer_name: signature.signer_name,
      signer_email: signature.signer_email,
    },
  });
}

export function useCreateSignature() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateSignatures();
  return useMutation({
    mutationFn: async (input: SignatureInput) => {
      const signature = await createSignature(workspaceId, input);
      await publish(
        workspaceId,
        signature,
        "signature.created",
        `Assinatura solicitada: ${signature.signer_name}`,
        userId,
        `${signature.signer_email} · ${SIGNATURE_STATUS_LABEL[signature.status]}`,
      );
      return signature;
    },
    onSuccess: (s) =>
      invalidate({ contractId: s.contract_id, empresaId: s.empresa_id, id: s.id }),
  });
}

const STATUS_TO_EVENT: Partial<Record<SignatureStatus, EmpresaEventType>> = {
  enviado: "signature.sent",
  visualizado: "signature.viewed",
  assinado: "signature.signed",
  recusado: "signature.rejected",
};

const STATUS_TO_TITLE: Partial<Record<SignatureStatus, string>> = {
  enviado: "Assinatura enviada",
  visualizado: "Assinatura visualizada",
  assinado: "Contrato assinado",
  recusado: "Assinatura recusada",
};

export function useUpdateSignatureStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateSignatures();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      previousStatus,
      signedAt,
    }: {
      id: string;
      status: SignatureStatus;
      previousStatus?: SignatureStatus;
      signedAt?: string;
    }) => {
      const signature = await updateSignatureStatus(workspaceId, id, status, {
        signedAt,
      });
      const tipo = STATUS_TO_EVENT[status];
      if (tipo) {
        const titulo = `${STATUS_TO_TITLE[status]}: ${signature.signer_name}`;
        const descricao = previousStatus
          ? `${SIGNATURE_STATUS_LABEL[previousStatus]} → ${SIGNATURE_STATUS_LABEL[status]}`
          : SIGNATURE_STATUS_LABEL[status];
        await publish(workspaceId, signature, tipo, titulo, userId, descricao);
      }
      return signature;
    },
    onSuccess: (s) =>
      invalidate({ contractId: s.contract_id, empresaId: s.empresa_id, id: s.id }),
  });
}

export function useDeleteSignature() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateSignatures();
  return useMutation({
    mutationFn: async ({
      id,
      contractId,
      empresaId,
    }: {
      id: string;
      contractId: string;
      empresaId: string;
    }) => {
      await deleteSignature(workspaceId, id);
      return { id, contractId, empresaId };
    },
    onSuccess: ({ id, contractId, empresaId }) =>
      invalidate({ id, contractId, empresaId }),
  });
}

/** Métricas puras sobre um conjunto de assinaturas. */
export function computeSignatureKpis(signatures: Signature[]) {
  const total = signatures.length;
  const pendentes = signatures.filter((s) =>
    ["pendente", "enviado", "visualizado"].includes(s.status),
  ).length;
  const assinadas = signatures.filter((s) => s.status === "assinado").length;
  const recusadas = signatures.filter((s) => s.status === "recusado").length;
  const ultimaAssinada =
    signatures
      .filter((s) => s.status === "assinado")
      .slice()
      .sort((a, b) => {
        const da = a.signed_at ?? a.updated_at;
        const db = b.signed_at ?? b.updated_at;
        return da < db ? 1 : -1;
      })[0] ?? null;
  return { total, pendentes, assinadas, recusadas, ultimaAssinada };
}
