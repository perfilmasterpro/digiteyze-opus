import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { useCreateContract, useUpdateContract } from "../hooks/use-contracts";
import {
  contractSchema,
  type ContractFormValues,
} from "../schemas/contracts.schema";
import {
  CONTRACT_STATUS,
  CONTRACT_STATUS_LABEL,
  type Contract,
  type ContractInput,
} from "../types/contracts.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contexto obrigatório — o contrato sempre nasce a partir de uma proposta. */
  proposalId: string;
  empresaId: string;
  contract?: Contract | null;
};

const EMPTY: ContractFormValues = {
  empresa_id: "",
  proposal_id: "",
  titulo: "",
  status: "rascunho",
  data_emissao: "",
  data_inicio: "",
  data_fim: "",
  valor: undefined,
  observacoes: "",
};

export function ContractFormDrawer({
  open,
  onOpenChange,
  proposalId,
  empresaId,
  contract,
}: Props) {
  const createMut = useCreateContract();
  const updateMut = useUpdateContract();
  const isEdit = Boolean(contract);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    if (contract) {
      form.reset({
        empresa_id: contract.empresa_id,
        proposal_id: contract.proposal_id,
        titulo: contract.titulo,
        status: contract.status,
        data_emissao: contract.data_emissao ?? "",
        data_inicio: contract.data_inicio ?? "",
        data_fim: contract.data_fim ?? "",
        valor: contract.valor,
        observacoes: contract.observacoes ?? "",
      });
    } else {
      form.reset({
        ...EMPTY,
        empresa_id: empresaId,
        proposal_id: proposalId,
      });
    }
  }, [open, contract, empresaId, proposalId, form]);

  async function onSubmit(values: ContractFormValues) {
    const input: ContractInput = {
      empresa_id: values.empresa_id,
      proposal_id: values.proposal_id,
      titulo: values.titulo.trim(),
      status: values.status,
      data_emissao: values.data_emissao || undefined,
      data_inicio: values.data_inicio || undefined,
      data_fim: values.data_fim || undefined,
      valor: typeof values.valor === "number" ? values.valor : undefined,
      observacoes: values.observacoes?.trim() || undefined,
    };
    try {
      if (contract) {
        await updateMut.mutateAsync({
          id: contract.id,
          input,
          previousStatus: contract.status,
        });
        toast.success("Contrato atualizado");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Contrato criado");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar contrato");
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEdit ? "Editar contrato" : "Novo contrato"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Atualize os dados do contrato comercial."
              : "Cadastro rápido de contrato — preparado para assinatura digital futura."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Contrato Growth OS v1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONTRACT_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {CONTRACT_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="data_emissao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emissão</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEdit ? "Salvar" : "Criar contrato"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
