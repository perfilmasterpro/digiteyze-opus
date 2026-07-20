import { Copy, Edit, MoreHorizontal, Send, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";

import { ProposalCard } from "./proposal-card";
import { ProposalFormDrawer } from "./proposal-form-drawer";
import {
  useDeleteProposal,
  useDuplicateProposal,
  useProposalsByOpportunity,
  useTransitionProposalStatus,
} from "../hooks/use-proposals";
import type { Proposal, ProposalStatus } from "../types/proposals.types";

/**
 * Lista de propostas de uma oportunidade — usada na aba "Propostas"
 * da rota `/crm/$id`. Encapsula ações CRUD, transições de status e RBAC.
 */
export function ProposalList({
  opportunityId,
  empresaId,
}: {
  opportunityId: string;
  empresaId: string;
}) {
  const role = useCurrentRole();
  const canCreate = can(role, "crm:proposal:create");
  const canUpdate = can(role, "crm:proposal:update");
  const canApprove = can(role, "crm:proposal:approve");

  const { data, isLoading } = useProposalsByOpportunity(opportunityId);
  const transition = useTransitionProposalStatus();
  const duplicate = useDuplicateProposal();
  const remove = useDeleteProposal();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [toDelete, setToDelete] = useState<Proposal | null>(null);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }
  function openEdit(p: Proposal) {
    setEditing(p);
    setDrawerOpen(true);
  }

  async function changeStatus(p: Proposal, status: ProposalStatus, msg: string) {
    try {
      await transition.mutateAsync({ id: p.id, status, previousStatus: p.status });
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar.");
    }
  }

  async function handleDuplicate(p: Proposal) {
    try {
      await duplicate.mutateAsync(p.id);
      toast.success("Proposta duplicada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar.");
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await remove.mutateAsync({
        id: toDelete.id,
        opportunityId: toDelete.opportunity_id,
        empresaId: toDelete.empresa_id,
      });
      toast.success("Proposta removida");
      setToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  if (isLoading) return <LoadingState label="Carregando propostas…" />;
  const list = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Propostas ({list.length})
        </h2>
        {canCreate ? (
          <Button size="sm" onClick={openCreate}>
            Nova proposta
          </Button>
        ) : null}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Nenhuma proposta"
          description="Crie a primeira proposta para esta oportunidade."
          action={
            canCreate ? (
              <Button size="sm" onClick={openCreate}>
                Nova proposta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((p) => {
            const canSend = canUpdate && p.status === "rascunho";
            const canApproveNow =
              canApprove && (p.status === "enviada" || p.status === "visualizada");
            const canRejectNow =
              canApprove && (p.status === "enviada" || p.status === "visualizada");
            return (
              <ProposalCard
                key={p.id}
                proposal={p}
                onOpen={canUpdate ? openEdit : undefined}
                actions={
                  <>
                    {canSend ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() =>
                          changeStatus(p, "enviada", "Proposta marcada como enviada")
                        }
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar
                      </Button>
                    ) : null}
                    {canApproveNow ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() =>
                          changeStatus(p, "aprovada", "Proposta aprovada")
                        }
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                    ) : null}
                    {canRejectNow ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-muted-foreground"
                        onClick={() =>
                          changeStatus(p, "recusada", "Proposta recusada")
                        }
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        Recusar
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
                      <DropdownMenuContent align="end" className="w-48">
                        {canUpdate ? (
                          <DropdownMenuItem onSelect={() => openEdit(p)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        ) : null}
                        {canCreate ? (
                          <DropdownMenuItem onSelect={() => handleDuplicate(p)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                        ) : null}
                        {canUpdate ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setToDelete(p)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <ProposalFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        opportunityId={opportunityId}
        empresaId={empresaId}
        proposal={editing}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => (o ? null : setToDelete(null))}
        title="Excluir proposta"
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
