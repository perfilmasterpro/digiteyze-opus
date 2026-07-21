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
import { getEmpresa } from "@/modules/empresas";

import {
  buildProposalPdfFilename,
  empresaToClient,
  generateProposalPdf,
} from "../services/proposal-pdf.service";

import {
  createProposal,
  deleteProposal,
  duplicateProposal,
  getProposal,
  listProposals,
  transitionProposalStatus,
  updateProposal,
} from "../services/proposals.service";
import {
  PROPOSAL_STATUS_LABEL,
  type Proposal,
  type ProposalInput,
  type ProposalStatus,
} from "../types/proposals.types";

export const proposalsKeys = {
  all: (workspaceId: string) => ["proposals", workspaceId] as const,
  byOpportunity: (workspaceId: string, opportunityId: string) =>
    ["proposals", workspaceId, "opportunity", opportunityId] as const,
  byEmpresa: (workspaceId: string, empresaId: string) =>
    ["proposals", workspaceId, "empresa", empresaId] as const,
  detail: (workspaceId: string, id: string) =>
    ["proposal", workspaceId, id] as const,
};

const DEFAULT_STALE_TIME = 30_000;

export function proposalsQueryOptions(workspaceId: string) {
  return queryOptions({
    queryKey: proposalsKeys.all(workspaceId),
    queryFn: () => listProposals(workspaceId),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function proposalsByOpportunityQueryOptions(
  workspaceId: string,
  opportunityId: string,
) {
  return queryOptions({
    queryKey: proposalsKeys.byOpportunity(workspaceId, opportunityId),
    queryFn: () => listProposals(workspaceId, { opportunityId }),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function proposalsByEmpresaQueryOptions(
  workspaceId: string,
  empresaId: string,
) {
  return queryOptions({
    queryKey: proposalsKeys.byEmpresa(workspaceId, empresaId),
    queryFn: () => listProposals(workspaceId, { empresaId }),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function proposalQueryOptions(workspaceId: string, id: string) {
  return queryOptions({
    queryKey: proposalsKeys.detail(workspaceId, id),
    queryFn: () => getProposal(workspaceId, id),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useProposals() {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery(proposalsQueryOptions(workspaceId));
}

export function useProposalsByOpportunity(opportunityId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...proposalsByOpportunityQueryOptions(workspaceId, opportunityId),
    enabled: Boolean(opportunityId),
  });
}

export function useProposalsByEmpresa(empresaId: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...proposalsByEmpresaQueryOptions(workspaceId, empresaId),
    enabled: Boolean(empresaId),
  });
}

export function useProposal(id: string) {
  const workspaceId = useCurrentWorkspaceId();
  return useQuery({
    ...proposalQueryOptions(workspaceId, id),
    enabled: Boolean(id),
  });
}

function useInvalidateProposals() {
  const qc = useQueryClient();
  const workspaceId = useCurrentWorkspaceId();
  return (opts: { opportunityId?: string; empresaId?: string; id?: string }) => {
    qc.invalidateQueries({ queryKey: proposalsKeys.all(workspaceId) });
    if (opts.opportunityId) {
      qc.invalidateQueries({
        queryKey: proposalsKeys.byOpportunity(workspaceId, opts.opportunityId),
      });
    }
    if (opts.empresaId) {
      qc.invalidateQueries({
        queryKey: proposalsKeys.byEmpresa(workspaceId, opts.empresaId),
      });
      qc.invalidateQueries({
        queryKey: empresaEventsKeys.all(workspaceId, opts.empresaId),
      });
    }
    if (opts.id) {
      qc.invalidateQueries({
        queryKey: proposalsKeys.detail(workspaceId, opts.id),
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
  proposal: Proposal,
  tipo: EmpresaEventType,
  titulo: string,
  createdBy: string,
  descricao?: string,
) {
  await publishEmpresaEvent({
    workspaceId,
    empresaId: proposal.empresa_id,
    modulo: "comercial",
    tipo,
    titulo,
    descricao,
    createdBy,
    createdByName: getCurrentUserName(),
    payload: {
      proposal_id: proposal.id,
      opportunity_id: proposal.opportunity_id,
      status: proposal.status,
      valor_total: proposal.valor_total,
    },
  });
}

export function useCreateProposal() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateProposals();
  return useMutation({
    mutationFn: async (input: ProposalInput) => {
      const proposal = await createProposal(workspaceId, input);
      await publish(
        workspaceId,
        proposal,
        "proposal.created",
        `Proposta criada: ${proposal.titulo}`,
        userId,
        `${currency.format(proposal.valor_total)} · ${PROPOSAL_STATUS_LABEL[proposal.status]}`,
      );
      return proposal;
    },
    onSuccess: (p) =>
      invalidate({ opportunityId: p.opportunity_id, empresaId: p.empresa_id, id: p.id }),
  });
}

export function useUpdateProposal() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateProposals();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProposalInput }) =>
      updateProposal(workspaceId, id, input),
    onSuccess: (p) =>
      invalidate({ opportunityId: p.opportunity_id, empresaId: p.empresa_id, id: p.id }),
  });
}

/**
 * Transição semântica de status. Publica o evento correspondente e
 * invalida caches. Regras de permissão são validadas na UI (RBAC).
 */
export function useTransitionProposalStatus() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateProposals();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      previousStatus,
    }: {
      id: string;
      status: ProposalStatus;
      previousStatus?: ProposalStatus;
    }) => {
      const proposal = await transitionProposalStatus(workspaceId, id, status);
      const tipo: EmpresaEventType | null =
        status === "enviada"
          ? "proposal.sent"
          : status === "aprovada"
            ? "proposal.approved"
            : status === "recusada"
              ? "proposal.rejected"
              : status === "expirada"
                ? "proposal.expired"
                : null;
      if (tipo) {
        const titulo =
          status === "enviada"
            ? `Proposta enviada: ${proposal.titulo}`
            : status === "aprovada"
              ? `Proposta aprovada: ${proposal.titulo}`
              : status === "recusada"
                ? `Proposta recusada: ${proposal.titulo}`
                : `Proposta expirada: ${proposal.titulo}`;
        const descricao = previousStatus
          ? `${PROPOSAL_STATUS_LABEL[previousStatus]} → ${PROPOSAL_STATUS_LABEL[status]}`
          : undefined;
        await publish(workspaceId, proposal, tipo, titulo, userId, descricao);
      }
      return proposal;
    },
    onSuccess: (p) =>
      invalidate({ opportunityId: p.opportunity_id, empresaId: p.empresa_id, id: p.id }),
  });
}

export function useDuplicateProposal() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  const invalidate = useInvalidateProposals();
  return useMutation({
    mutationFn: async (id: string) => {
      const proposal = await duplicateProposal(workspaceId, id);
      await publish(
        workspaceId,
        proposal,
        "proposal.created",
        `Proposta duplicada: ${proposal.titulo}`,
        userId,
      );
      return proposal;
    },
    onSuccess: (p) =>
      invalidate({ opportunityId: p.opportunity_id, empresaId: p.empresa_id, id: p.id }),
  });
}

export function useDeleteProposal() {
  const workspaceId = useCurrentWorkspaceId();
  const invalidate = useInvalidateProposals();
  return useMutation({
    mutationFn: async ({
      id,
      opportunityId,
      empresaId,
    }: {
      id: string;
      opportunityId: string;
      empresaId: string;
    }) => {
      await deleteProposal(workspaceId, id);
      return { id, opportunityId, empresaId };
    },
    onSuccess: ({ id, opportunityId, empresaId }) =>
      invalidate({ id, opportunityId, empresaId }),
  });
}

export type ProposalPdfMode = "download" | "preview";

export interface GenerateProposalPdfResult {
  blob: Blob;
  objectUrl: string;
  filename: string;
}

/**
 * Gera o PDF de uma proposta usando a service isolada `proposal-pdf.service`
 * e publica o evento `proposal.pdf_generated` na timeline da empresa.
 * O hook resolve a Empresa via barrel público (sem acesso direto a storage).
 */
export function useGenerateProposalPdf() {
  const workspaceId = useCurrentWorkspaceId();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: async ({
      proposal,
      mode = "download",
    }: {
      proposal: Proposal;
      mode?: ProposalPdfMode;
    }): Promise<GenerateProposalPdfResult> => {
      const empresa = await getEmpresa(workspaceId, proposal.empresa_id);
      const blob = await generateProposalPdf({
        proposal,
        client: empresa ? empresaToClient(empresa) : undefined,
      });
      const objectUrl = URL.createObjectURL(blob);
      const filename = buildProposalPdfFilename(proposal);

      if (mode === "download") {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }

      await publish(
        workspaceId,
        proposal,
        "proposal.pdf_generated",
        `PDF gerado: ${proposal.titulo}`,
        userId,
        mode === "preview" ? "Visualização" : "Download",
      );

      return { blob, objectUrl, filename };
    },
  });

/** Métricas puras a partir de um conjunto de propostas. */
export function computeProposalKpis(proposals: Proposal[]) {
  const total = proposals.length;
  const em_negociacao = proposals.filter((p) =>
    ["rascunho", "enviada", "visualizada"].includes(p.status),
  );
  const aprovadas = proposals.filter((p) => p.status === "aprovada");
  const recusadas = proposals.filter((p) => p.status === "recusada");
  const valorEmNegociacao = em_negociacao.reduce((s, p) => s + (p.valor_total || 0), 0);
  const valorAprovado = aprovadas.reduce((s, p) => s + (p.valor_total || 0), 0);
  const ultimaEnviada =
    proposals
      .filter((p) => p.data_envio)
      .sort((a, b) => ((a.data_envio ?? "") < (b.data_envio ?? "") ? 1 : -1))[0] ?? null;
  return {
    total,
    valorEmNegociacao,
    valorAprovado,
    quantidadeAprovadas: aprovadas.length,
    quantidadeRecusadas: recusadas.length,
    ultimaEnviada,
  };
}
