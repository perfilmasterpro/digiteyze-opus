import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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

import { useCreateProposal, useUpdateProposal } from "../hooks/use-proposals";
import {
  proposalSchema,
  type ProposalFormValues,
} from "../schemas/proposals.schema";
import {
  PROPOSAL_STATUS,
  PROPOSAL_STATUS_LABEL,
  computeItemTotal,
  type Proposal,
  type ProposalInput,
} from "../types/proposals.types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contexto obrigatório — a proposta sempre nasce dentro de uma oportunidade. */
  opportunityId: string;
  empresaId: string;
  proposal?: Proposal | null;
};

const EMPTY: ProposalFormValues = {
  empresa_id: "",
  opportunity_id: "",
  titulo: "",
  status: "rascunho",
  validade_dias: 15,
  observacoes: "",
  items: [{ descricao: "", quantidade: 1, valor_unitario: 0 }],
};

export function ProposalFormDrawer({
  open,
  onOpenChange,
  opportunityId,
  empresaId,
  proposal,
}: Props) {
  const createMut = useCreateProposal();
  const updateMut = useUpdateProposal();
  const isEdit = Boolean(proposal);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });
  const items = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");

  const total = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (s, it) => s + computeItemTotal(Number(it?.quantidade), Number(it?.valor_unitario)),
        0,
      ),
    [watchedItems],
  );

  useEffect(() => {
    if (!open) return;
    if (proposal) {
      form.reset({
        empresa_id: proposal.empresa_id,
        opportunity_id: proposal.opportunity_id,
        titulo: proposal.titulo,
        status: proposal.status,
        validade_dias: proposal.validade_dias,
        observacoes: proposal.observacoes ?? "",
        items: proposal.items.map((i) => ({
          descricao: i.descricao,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
        })),
      });
    } else {
      form.reset({
        ...EMPTY,
        empresa_id: empresaId,
        opportunity_id: opportunityId,
      });
    }
  }, [open, proposal, empresaId, opportunityId, form]);

  async function onSubmit(values: ProposalFormValues) {
    const input: ProposalInput = {
      empresa_id: values.empresa_id,
      opportunity_id: values.opportunity_id,
      titulo: values.titulo.trim(),
      status: values.status,
      validade_dias: values.validade_dias,
      observacoes: values.observacoes?.trim() || undefined,
      items: values.items,
    };
    try {
      if (proposal) {
        await updateMut.mutateAsync({ id: proposal.id, input });
        toast.success("Proposta atualizada");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Proposta criada");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar proposta");
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEdit ? "Editar proposta" : "Nova proposta"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Atualize os dados da proposta comercial."
              : "Cadastro rápido de proposta — preparada para geração futura de PDF."}
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
                      <Input placeholder="Ex.: Proposta Growth OS v1" {...field} />
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
                          {PROPOSAL_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {PROPOSAL_STATUS_LABEL[s]}
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
                  name="validade_dias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade (dias) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <section aria-labelledby="proposal-items">
                <div className="mb-2 flex items-center justify-between">
                  <h3 id="proposal-items" className="text-sm font-semibold">
                    Itens da proposta *
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() =>
                      items.append({ descricao: "", quantidade: 1, valor_unitario: 0 })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar item
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.fields.map((f, idx) => {
                    const qtd = Number(watchedItems?.[idx]?.quantidade) || 0;
                    const unit = Number(watchedItems?.[idx]?.valor_unitario) || 0;
                    const rowTotal = computeItemTotal(qtd, unit);
                    return (
                      <div key={f.id} className="rounded-md border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Item {idx + 1}
                          </span>
                          {items.fields.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => items.remove(idx)}
                              aria-label={`Remover item ${idx + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${idx}.descricao` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Descrição</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ex.: Setup inicial" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name={`items.${idx}.quantidade` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Qtd.</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0.01}
                                      step="0.01"
                                      value={field.value ?? ""}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === "" ? 0 : Number(e.target.value),
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${idx}.valor_unitario` as const}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Unit. (R$)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={field.value ?? ""}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value === "" ? 0 : Number(e.target.value),
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormItem>
                              <FormLabel className="text-xs">Total</FormLabel>
                              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                                {currency.format(rowTotal)}
                              </div>
                            </FormItem>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.formState.errors.items?.message ? (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.items.message}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                  <span className="text-muted-foreground">Total da proposta:</span>
                  <span className="text-base font-semibold text-foreground">
                    {currency.format(total)}
                  </span>
                </div>
              </section>

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
                {isEdit ? "Salvar" : "Criar proposta"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
