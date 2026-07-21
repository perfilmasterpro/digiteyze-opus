import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  CONTRACT_STATUS_LABEL,
  type ContractStatus,
} from "../types/contracts.types";

const TONE: Record<ContractStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  emitido: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  enviado: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  assinado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelado: "bg-destructive/15 text-destructive",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", TONE[status])}>
      {CONTRACT_STATUS_LABEL[status]}
    </Badge>
  );
}
