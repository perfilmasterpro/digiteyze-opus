import { StatusBadge, type StatusTone } from "@/components/common/status-badge";

import {
  PROPOSAL_STATUS_LABEL,
  type ProposalStatus,
} from "../types/proposals.types";

const TONE: Record<ProposalStatus, StatusTone> = {
  rascunho: "neutral",
  enviada: "info",
  visualizada: "primary",
  aprovada: "success",
  recusada: "destructive",
  expirada: "warning",
};

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <StatusBadge tone={TONE[status]}>{PROPOSAL_STATUS_LABEL[status]}</StatusBadge>;
}
