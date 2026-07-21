import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { useCreateSignature } from "../hooks/use-signatures";
import {
  signatureSchema,
  type SignatureFormValues,
} from "../schemas/signatures.schema";
import type { SignatureInput } from "../types/signatures.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  empresaId: string;
};

/**
 * Diálogo de solicitação de assinatura — cria uma `Signature` com status
 * inicial `enviado`. Envio real por e-mail e integração com provedores
 * digitais ficam fora de escopo neste sprint.
 */
export function SignatureRequestDialog({
  open,
  onOpenChange,
  contractId,
  empresaId,
}: Props) {
  const createMut = useCreateSignature();

  const form = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      contract_id: contractId,
      empresa_id: empresaId,
      status: "enviado",
      signer_name: "",
      signer_email: "",
      signed_at: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      contract_id: contractId,
      empresa_id: empresaId,
      status: "enviado",
      signer_name: "",
      signer_email: "",
      signed_at: "",
    });
  }, [open, contractId, empresaId, form]);

  async function onSubmit(values: SignatureFormValues) {
    const input: SignatureInput = {
      contract_id: values.contract_id,
      empresa_id: values.empresa_id,
      status: values.status,
      signer_name: values.signer_name.trim(),
      signer_email: values.signer_email.trim(),
      signed_at: values.signed_at || undefined,
    };
    try {
      await createMut.mutateAsync(input);
      toast.success("Solicitação de assinatura registrada");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para assinatura</DialogTitle>
          <DialogDescription>
            Registre o signatário responsável. O envio real por e-mail será
            habilitado em uma etapa futura.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="signer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do signatário *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="signer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={createMut.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
