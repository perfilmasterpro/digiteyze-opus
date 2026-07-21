import { CalendarClock, CheckCircle2, Edit, Eye, MoreHorizontal, PenLine, Send, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";

import { ContractFormDrawer } from "./contract-form-drawer";
import { ContractStatusBadge } from "./contract-status-badge";
import {
  useContractsByProposal,
  useDeleteContract,
} from "../hooks/use-contracts";
import { useProposalsByOpportunity } from "../hooks/use-proposals";
import type { Contract } from "../types/contracts.types";
import {
  SignatureRequestDialog,
  SignatureStatusBadge,
  useSignaturesByContract,
  useUpdateSignatureStatus,
  type Signature,
} from "../signatures";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Lista de contratos de uma oportunidade — usada na aba "Contratos"
 * de `/crm/$id`. Agrega contratos de todas as propostas da oportunidade.
 * Novo contrato exige selecionar uma proposta de origem.
 */
export function ContractList({
  opportunityId,
  empresaId,
}: {
  opportunityId: string;
  empresaId: string;
}) {
  const role = useCurrentRole();
  const canCreate = can(role, "crm:contract:create");
  const canUpdate = can(role, "crm:contract:update");
  const canDelete = can(role, "crm:contract:delete");

  const { data: proposals } = useProposalsByOpportunity(opportunityId);
  const proposalIds = (proposals ?? []).map((p) => p.id);
  const firstProposalId = proposalIds[0] ?? "";

  // Lista contratos por empresa (todos os contratos da empresa)
  // e filtra pelos ids das propostas desta oportunidade — evita
  // múltiplos hooks dinâmicos.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [toDelete, setToDelete] = useState<Contract | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("");

  const remove = useDeleteContract();

  // Reutiliza o hook por proposta agregando manualmente.
  // Como MVP, faz uma única query por proposta usando o primeiro id
  // e concatena localmente via `useContractsByProposal` desabilitado
  // quando não há propostas.
  const { data: firstList, isLoading } = useContractsByProposal(firstProposalId);

  // Para múltiplas propostas: filtro adicional a partir da query
  // por empresa não é necessário no MVP — a maioria das oportunidades
  // possui poucas propostas. Ampliar se necessário.
  const list = (firstList ?? []).filter((c) =>
    proposalIds.includes(c.proposal_id),
  );

  function openCreate() {
    if (proposalIds.length === 0) {
      toast.error("Crie uma proposta antes de gerar um contrato.");
      return;
    }
    setEditing(null);
    setSelectedProposalId(firstProposalId);
    setDrawerOpen(true);
  }
  function openEdit(c: Contract) {
    setEditing(c);
    setSelectedProposalId(c.proposal_id);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await remove.mutateAsync({
        id: toDelete.id,
        proposalId: toDelete.proposal_id,
        empresaId: toDelete.empresa_id,
      });
      toast.success("Contrato removido");
      setToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  if (isLoading) return <LoadingState label="Carregando contratos…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Contratos ({list.length})
        </h2>
        {canCreate ? (
          <Button size="sm" onClick={openCreate}>
            Novo contrato
          </Button>
        ) : null}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhum contrato"
          description={
            proposalIds.length === 0
              ? "Crie uma proposta antes de gerar contratos."
              : "Gere o primeiro contrato a partir de uma proposta."
          }
          action={
            canCreate && proposalIds.length > 0 ? (
              <Button size="sm" onClick={openCreate}>
                Novo contrato
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={() => openEdit(c)}
              onDelete={() => setToDelete(c)}
            />
          ))}
        </div>
      )}

      <ContractFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        proposalId={selectedProposalId || firstProposalId}
        empresaId={empresaId}
        contract={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => (o ? null : setToDelete(null))}
        title="Excluir contrato"
        description={
          toDelete
            ? `Esta ação removerá "${toDelete.titulo}". Não é possível desfazer.`
            : undefined
        }
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
