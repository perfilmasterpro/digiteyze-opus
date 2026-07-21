import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  SIGNATURE_STATUS_LABEL,
  type SignatureStatus,
} from "../types/signatures.types";

const TONE: Record<SignatureStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  enviado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  visualizado: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  assinado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  recusado: "bg-destructive/15 text-destructive",
  expirado: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export function SignatureStatusBadge({ status }: { status: SignatureStatus }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", TONE[status])}>
      {SIGNATURE_STATUS_LABEL[status]}
    </Badge>
  );
}
