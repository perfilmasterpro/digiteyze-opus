import { ArrowRightLeft, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { Lead } from "../types/leads.types";

type Props = {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
};

export function LeadConvertDialog({ lead, open, onOpenChange, onConfirm, loading }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Converter em empresa
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Uma nova empresa <strong className="text-foreground">{lead.nome_empresa}</strong> será
                criada com os dados atuais deste lead. O lead será marcado como{" "}
                <strong className="text-foreground">Cliente</strong> e vinculado à empresa criada.
              </p>
              <p>
                Esta ação registra um evento no histórico do lead e não pode ser desfeita
                automaticamente.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={(e) => { e.preventDefault(); onConfirm(); }}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Converter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
