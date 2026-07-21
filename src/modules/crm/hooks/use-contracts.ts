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
  createContract,
  deleteContract,
  getContract,
  listContracts,
  updateContract,
} from "../services/contracts.service";
import {
  CONTRACT_STATUS_LABEL,
  type Contract,
  type ContractInput,
  type ContractStatus,
} from "../types/contracts.types";

export const contractKeys = {
  all: (workspaceId: string) => ["contracts", workspaceId] as const,
  byProposal: (workspaceId: string, proposalId: string) =>
    ["contracts", workspaceId, "proposal", proposalId] as const,
  byEmpresa: (workspaceId: string, empresaId: string) =>
    ["contracts", workspaceId, "empresa", empresaId] as const,
  detail: (workspaceId: string, id: string) =>
    ["contract", workspaceId, id] as const,
};

const DEFAULT_STALE_TIME = 30_000;

export function contractsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: contractKeys.all(workspaceId),
    queryFn: () => listContracts(workspaceId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function contractsByProposalQueryOptions(
  workspaceId: string,
  proposalId: string,
) {
  return queryOptions({
    queryKey: contractKeys.byProposal(workspaceId, proposalId),
    queryFn: () => listContracts(workspaceId, { proposalId }),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function contractsByEmpresaQueryOptions(
  workspaceId: string,
  empresaId: string,
) {
  return queryOptions({
    queryKey: contractKeys.byEmpresa(workspaceId, empresaId),
    queryFn: () => listContracts(workspaceId, { empresaId }),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function contractQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: contractKeys.detail(workspaceId, id),
    queryFn: () => getContract(workspaceId, id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useContracts() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(contractsQueryOptions(workspaceId));
}

export function useContractsByProposal(proposalId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...contractsByProposalQueryOptions(workspaceId, proposalId),
    enabled: Boolean(proposalId),
  });
}

export function useContractsByEmpresa(empresaId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...contractsByEmpresaQueryOptions(workspaceId, empresaId),
    enabled: Boolean(empresaId),
  });
}

export function useContract(id: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...contractQueryOptions(workspaceId, id),
    enabled: Boolean(id),
  });
}

function useInvalidateContracts() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return (opts: { proposalId?: string; empresaId?: string; id?: string }) => {
    qc.invalidateQueries({ queryKey: contractKeys.all(workspaceId) });
    if (opts.proposalId) {
      qc.invalidateQueries({
        queryKey: contractKeys.byProposal(workspaceId, opts.proposalId),
      });
    }
    if (opts.empresaId) {
      qc.invalidateQueries({
        queryKey: contractKeys.byEmpresa(workspaceId, opts.empresaId),
      });
      qc.invalidateQueries({
        queryKey: empresaEventsKeys.all(workspaceId, opts.empresaId),
      });
    }
    if (opts.id) {
      qc.invalidateQueries({
        queryKey: contractKeys.detail(workspaceId, opts.id),
      });
    }
  };
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

async function publish(
  workspaceId: string,
  contract: Contract,
  tipo: EmpresaEventType,
  titulo: string,
  createdBy: string,
  descricao?: string,
) {
  await publishEmpresaEvent({
    workspaceId,
    empresaId: contract.empresa_id,
    modulo: "comercial",
    tipo,
    titulo,
    descricao,
    createdBy,
    createdByName: getCurrentUserName(),
    payload: {
      contract_id: contract.id,
      proposal_id: contract.proposal_id,
      numero: contract.numero,
      status: contract.status,
      valor: contract.valor,
    },
  });
}

export function useCreateContract() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: async (input: ContractInput) => {
      const contract = await createContract(workspaceId, input);
      await publish(
        workspaceId,
        contract,
        "contract.created",
        `Contrato criado: ${contract.titulo}`,
        userId,
        `${contract.numero} · ${CONTRACT_STATUS_LABEL[contract.status]}${
          typeof contract.valor === "number"
            ? ` · ${currency.format(contract.valor)}`
            : ""
        }`,
      );
      return contract;
    },
    onSuccess: (c) =>
      invalidate({ proposalId: c.proposal_id, empresaId: c.empresa_id, id: c.id }),
  });
}

export function useUpdateContract() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      previousStatus,
    }: {
      id: string;
      input: ContractInput;
      previousStatus?: ContractStatus;
    }) => {
      const contract = await updateContract(workspaceId, id, input);
      // Publica eventos semânticos quando o status atravessa fronteiras relevantes
      const tipo: EmpresaEventType | null =
        previousStatus && previousStatus !== contract.status
          ? contract.status === "enviado"
            ? "contract.sent"
            : contract.status === "assinado"
              ? "contract.signed"
              : contract.status === "cancelado"
                ? "contract.cancelled"
                : "contract.updated"
          : "contract.updated";
      const titulo =
        tipo === "contract.sent"
          ? `Contrato enviado: ${contract.titulo}`
          : tipo === "contract.signed"
            ? `Contrato assinado: ${contract.titulo}`
            : tipo === "contract.cancelled"
              ? `Contrato cancelado: ${contract.titulo}`
              : `Contrato atualizado: ${contract.titulo}`;
      const descricao = previousStatus
        ? `${CONTRACT_STATUS_LABEL[previousStatus]} → ${CONTRACT_STATUS_LABEL[contract.status]}`
        : contract.numero;
      await publish(workspaceId, contract, tipo, titulo, userId, descricao);
      return contract;
    },
    onSuccess: (c) =>
      invalidate({ proposalId: c.proposal_id, empresaId: c.empresa_id, id: c.id }),
  });
}

export function useDeleteContract() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: async ({
      id,
      proposalId,
      empresaId,
    }: {
      id: string;
      proposalId: string;
      empresaId: string;
    }) => {
      await deleteContract(workspaceId, id);
      return { id, proposalId, empresaId };
    },
    onSuccess: ({ id, proposalId, empresaId }) =>
      invalidate({ id, proposalId, empresaId }),
  });
}

/** Métricas puras sobre um conjunto de contratos. */
export function computeContractKpis(contracts: Contract[]) {
  const total = contracts.length;
  const ativos = contracts.filter((c) =>
    ["emitido", "enviado", "assinado"].includes(c.status),
  ).length;
  const assinados = contracts.filter((c) => c.status === "assinado").length;
  const cancelados = contracts.filter((c) => c.status === "cancelado").length;
  const valorAssinado = contracts
    .filter((c) => c.status === "assinado")
    .reduce((s, c) => s + (c.valor ?? 0), 0);
  const ultimo =
    contracts
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
  return { total, ativos, assinados, cancelados, valorAssinado, ultimo };
}
