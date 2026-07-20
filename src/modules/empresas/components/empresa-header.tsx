import { Archive, ArchiveRestore, Building2, ChevronLeft, Edit } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";

import {
  EMPRESA_STATUS_LABEL,
  EMPRESA_TIPO_LABEL,
  type Empresa,
  type EmpresaStatus,
} from "../empresas.types";

const STATUS_TONE: Record<EmpresaStatus, StatusTone> = {
  ativo: "success",
  inativo: "neutral",
  arquivado: "warning",
};

type Props = {
  empresa: Empresa;
  canUpdate: boolean;
  canArchive: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onReactivate: () => void;
};

/**
 * Header fixo da página 360° da empresa.
 *
 * Exibe identidade (logo placeholder, nome, tipo, status, responsável) e
 * ações primárias (Editar, Arquivar/Reativar). Tags e demais vínculos
 * serão adicionados em sprints futuros — a estrutura já contempla o slot.
 */
export function EmpresaHeader({
  empresa,
  canUpdate,
  canArchive,
  onEdit,
  onArchive,
  onReactivate,
}: Props) {
  const isArchived = empresa.status === "arquivado";

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-muted-foreground">
        <Link to="/empresas">
          <ChevronLeft className="h-4 w-4" />
          Empresas
        </Link>
      </Button>

      <PageHeader
        title={empresa.nome}
        icon={<Building2 className="h-5 w-5" />}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <StatusBadge tone={STATUS_TONE[empresa.status]}>
              {EMPRESA_STATUS_LABEL[empresa.status]}
            </StatusBadge>
            <span>{EMPRESA_TIPO_LABEL[empresa.tipo]}</span>
            <span aria-hidden>·</span>
            <span>Responsável: {empresa.responsavel}</span>
          </span>
        }
        actions={
          <>
            {canUpdate ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={onEdit}>
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            ) : null}
            {canArchive && !isArchived ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={onArchive}>
                <Archive className="h-4 w-4" />
                Arquivar
              </Button>
            ) : null}
            {canArchive && isArchived ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={onReactivate}>
                <ArchiveRestore className="h-4 w-4" />
                Reativar
              </Button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
