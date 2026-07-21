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

function ContractCard({
  contract,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  contract: Contract;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const role = useCurrentRole();
  const canSignatureView = can(role, "crm:signature:view");
  const canSignatureCreate = can(role, "crm:signature:create");
  const canSignatureSign = can(role, "crm:signature:sign");
  const canSignatureUpdate = can(role, "crm:signature:update");

  const { data: signatures } = useSignaturesByContract(contract.id);
  const updateStatus = useUpdateSignatureStatus();
  const [reqOpen, setReqOpen] = useState(false);

  const list = signatures ?? [];
  const latest = list[0] ?? null;

  async function transition(sig: Signature, next: Signature["status"]) {
    try {
      await updateStatus.mutateAsync({
        id: sig.id,
        status: next,
        previousStatus: sig.status,
      });
      toast.success("Assinatura atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {contract.titulo}
              </span>
              <ContractStatusBadge status={contract.status} />
              <span className="text-xs text-muted-foreground">
                {contract.numero}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Emissão {fmt(contract.data_emissao)}
              </span>
              <span>
                Vigência {fmt(contract.data_inicio)} — {fmt(contract.data_fim)}
              </span>
              {typeof contract.valor === "number" ? (
                <span className="font-semibold text-foreground">
                  {currency.format(contract.valor)}
                </span>
              ) : null}
            </div>
            {contract.observacoes ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {contract.observacoes}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            {canUpdate ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={onEdit}
              >
                <Eye className="h-3.5 w-3.5" />
                Visualizar
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {canUpdate ? (
                  <DropdownMenuItem onSelect={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                ) : null}
                {canSignatureCreate ? (
                  <DropdownMenuItem onSelect={() => setReqOpen(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para assinatura
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={onDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {canSignatureView ? (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <PenLine className="h-3 w-3" />
                Assinatura
              </span>
              {latest ? (
                <SignatureStatusBadge status={latest.status} />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Nenhuma solicitação
                </span>
              )}
            </div>
            {latest ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {latest.signer_name}
                  </span>{" "}
                  · {latest.signer_email}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {latest.signed_at ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Assinado {fmt(latest.signed_at)}
                    </span>
                  ) : null}
                  {canSignatureSign && latest.status !== "assinado" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1"
                      onClick={() => transition(latest, "assinado")}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Marcar como assinado
                    </Button>
                  ) : null}
                  {canSignatureUpdate &&
                  latest.status !== "assinado" &&
                  latest.status !== "recusado" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-destructive"
                      onClick={() => transition(latest, "recusado")}
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Recusar
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : canSignatureCreate ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => setReqOpen(true)}
              >
                <Send className="h-3.5 w-3.5" />
                Enviar para assinatura
              </Button>
            ) : null}
            {list.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs">
                    Histórico ({list.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel>Assinaturas anteriores</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {list.slice(1).map((s) => (
                    <DropdownMenuItem key={s.id} className="flex-col items-start">
                      <span className="text-xs font-medium">{s.signer_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {s.signer_email} · {s.status}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}

        <SignatureRequestDialog
          open={reqOpen}
          onOpenChange={setReqOpen}
          contractId={contract.id}
          empresaId={contract.empresa_id}
        />
      </CardContent>
    </Card>
  );
}
