import {
  computeItemTotal,
  computeProposalTotal,
  type Proposal,
  type ProposalInput,
  type ProposalItem,
  type ProposalItemInput,
  type ProposalStatus,
} from "../types/proposals.types";

/**
 * Service do domínio CRM — Propostas Comerciais.
 *
 * Persistência atual: `localStorage`. Assinaturas recebem `workspaceId`
 * explicitamente para paridade com o filtro RLS Supabase e para manter
 * as queryKeys do React Query escopadas por workspace.
 *
 * Modelo simplificado: `ProposalItem[]` é embutido na proposta para
 * minimizar joins locais. Ao migrar para Supabase será desmembrado em
 * tabela `proposal_items` com FK, mas a API pública deste service
 * permanece estável.
 */

const STORAGE_KEY = "growth-os:proposals";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): Proposal[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Proposal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: Proposal[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId(prefix: string) {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function toItems(proposalId: string, inputs: ProposalItemInput[]): ProposalItem[] {
  return inputs.map((i) => ({
    id: generateId("pri"),
    proposal_id: proposalId,
    descricao: i.descricao.trim(),
    quantidade: i.quantidade,
    valor_unitario: i.valor_unitario,
    total: computeItemTotal(i.quantidade, i.valor_unitario),
  }));
}

export async function listProposals(
  workspaceId: string,
  filters?: { opportunityId?: string; empresaId?: string },
): Promise<Proposal[]> {
  return readAll()
    .filter((p) => p.workspace_id === workspaceId)
    .filter((p) =>
      filters?.opportunityId ? p.opportunity_id === filters.opportunityId : true,
    )
    .filter((p) => (filters?.empresaId ? p.empresa_id === filters.empresaId : true))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getProposal(
  workspaceId: string,
  id: string,
): Promise<Proposal | null> {
  return (
    readAll().find((p) => p.id === id && p.workspace_id === workspaceId) ?? null
  );
}

export async function createProposal(
  workspaceId: string,
  input: ProposalInput,
): Promise<Proposal> {
  const now = new Date().toISOString();
  const id = generateId("prp");
  const items = toItems(id, input.items);
  const proposal: Proposal = {
    id,
    workspace_id: workspaceId,
    empresa_id: input.empresa_id,
    opportunity_id: input.opportunity_id,
    titulo: input.titulo.trim(),
    status: input.status,
    validade_dias: input.validade_dias,
    valor_total: computeProposalTotal(items),
    observacoes: input.observacoes?.toString().trim() || undefined,
    data_envio: input.data_envio,
    data_resposta: input.data_resposta,
    items,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(proposal);
  writeAll(list);
  return proposal;
}

export async function updateProposal(
  workspaceId: string,
  id: string,
  input: ProposalInput,
): Promise<Proposal> {
  const list = readAll();
  const idx = list.findIndex(
    (p) => p.id === id && p.workspace_id === workspaceId,
  );
  if (idx === -1) throw new Error("Proposta não encontrada");
  const items = toItems(id, input.items);
  const updated: Proposal = {
    ...list[idx],
    empresa_id: input.empresa_id,
    opportunity_id: input.opportunity_id,
    titulo: input.titulo.trim(),
    status: input.status,
    validade_dias: input.validade_dias,
    valor_total: computeProposalTotal(items),
    observacoes: input.observacoes?.toString().trim() || undefined,
    items,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

/**
 * Atualização parcial de status — usada por transições semânticas
 * (enviar, aprovar, recusar). Preenche datas conforme o novo status.
 */
export async function transitionProposalStatus(
  workspaceId: string,
  id: string,
  status: ProposalStatus,
): Promise<Proposal> {
  const list = readAll();
  const idx = list.findIndex(
    (p) => p.id === id && p.workspace_id === workspaceId,
  );
  if (idx === -1) throw new Error("Proposta não encontrada");
  const now = new Date().toISOString();
  const current = list[idx];
  const updated: Proposal = {
    ...current,
    status,
    data_envio:
      status === "enviada" && !current.data_envio ? now : current.data_envio,
    data_resposta:
      status === "aprovada" || status === "recusada"
        ? now
        : status === "rascunho" || status === "enviada"
          ? undefined
          : current.data_resposta,
    updated_at: now,
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}

export async function duplicateProposal(
  workspaceId: string,
  id: string,
): Promise<Proposal> {
  const original = await getProposal(workspaceId, id);
  if (!original) throw new Error("Proposta não encontrada");
  const input: ProposalInput = {
    empresa_id: original.empresa_id,
    opportunity_id: original.opportunity_id,
    titulo: `${original.titulo} (cópia)`,
    status: "rascunho",
    validade_dias: original.validade_dias,
    observacoes: original.observacoes,
    items: original.items.map(({ descricao, quantidade, valor_unitario }) => ({
      descricao,
      quantidade,
      valor_unitario,
    })),
  };
  return createProposal(workspaceId, input);
}

export async function deleteProposal(
  workspaceId: string,
  id: string,
): Promise<void> {
  const list = readAll().filter(
    (p) => !(p.id === id && p.workspace_id === workspaceId),
  );
  writeAll(list);
}
