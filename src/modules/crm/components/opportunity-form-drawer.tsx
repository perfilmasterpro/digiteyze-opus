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
import { useEmpresas } from "@/modules/empresas";

import { useCreateOpportunity, useUpdateOpportunity } from "../hooks/use-opportunities";
import {
  opportunitySchema,
  type OpportunityFormValues,
} from "../schemas/opportunities.schema";
import {
  OPPORTUNITY_MOTIVOS_PERDA,
  OPPORTUNITY_MOTIVO_PERDA_LABEL,
  OPPORTUNITY_ORIGENS,
  OPPORTUNITY_ORIGEM_LABEL,
  OPPORTUNITY_PROBABILIDADES,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUS_LABEL,
  type Opportunity,
  type OpportunityInput,
  type OpportunityMotivoPerda,
} from "../types/opportunities.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity | null;
  /** Empresa pré-selecionada (ex.: quando aberto da aba Comercial da Empresa). */
  defaultEmpresaId?: string;
};

const EMPTY: OpportunityFormValues = {
  empresa_id: "",
  nome: "",
  status: "qualificado",
  origem: "prospeccao",
  valor_estimado: 0,
  probabilidade: 50,
  responsavel_id: "",
  responsavel_nome: "",
  data_fechamento_prevista: "",
  motivo_perda: "",
  observacoes: "",
};

export function OpportunityFormDrawer({
  open,
  onOpenChange,
  opportunity,
  defaultEmpresaId,
}: Props) {
  const { data: empresas } = useEmpresas();
  const createMut = useCreateOpportunity();
  const updateMut = useUpdateOpportunity();
  const isEdit = Boolean(opportunity);

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: EMPTY,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    if (opportunity) {
      form.reset({
        empresa_id: opportunity.empresa_id,
        nome: opportunity.nome,
        status: opportunity.status,
        origem: opportunity.origem,
        valor_estimado: opportunity.valor_estimado,
        probabilidade: opportunity.probabilidade,
        responsavel_id: opportunity.responsavel_id ?? "",
        responsavel_nome: opportunity.responsavel_nome ?? "",
        data_fechamento_prevista: opportunity.data_fechamento_prevista ?? "",
        motivo_perda: opportunity.motivo_perda ?? "",
        observacoes: opportunity.observacoes ?? "",
      });
    } else {
      form.reset({ ...EMPTY, empresa_id: defaultEmpresaId ?? "" });
    }
  }, [open, opportunity, defaultEmpresaId, form]);

  const status = form.watch("status");

  async function onSubmit(values: OpportunityFormValues) {
    const input: OpportunityInput = {
      empresa_id: values.empresa_id,
      nome: values.nome.trim(),
      status: values.status,
      origem: values.origem,
      valor_estimado: values.valor_estimado,
      probabilidade: values.probabilidade as OpportunityInput["probabilidade"],
      responsavel_id: values.responsavel_id || undefined,
      responsavel_nome: values.responsavel_nome?.trim() || undefined,
      data_fechamento_prevista: values.data_fechamento_prevista || undefined,
      motivo_perda:
        values.status === "perdido"
          ? (values.motivo_perda as OpportunityMotivoPerda) || undefined
          : undefined,
      observacoes: values.observacoes?.trim() || undefined,
    };
    try {
      if (opportunity) {
        await updateMut.mutateAsync({ id: opportunity.id, input });
        toast.success("Oportunidade atualizada");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Oportunidade criada");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar oportunidade");
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEdit ? "Editar oportunidade" : "Nova oportunidade"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Atualize os dados desta oportunidade."
              : "Cadastro rápido do pipeline comercial."}
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
                name="empresa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(empresas ?? []).map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
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
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da oportunidade *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Implantação Growth OS" {...field} />
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
                          {OPPORTUNITY_STATUS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {OPPORTUNITY_STATUS_LABEL[s]}
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
                  name="origem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_ORIGENS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {OPPORTUNITY_ORIGEM_LABEL[o]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="valor_estimado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor estimado (R$) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
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

                <FormField
                  control={form.control}
                  name="probabilidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidade *</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_PROBABILIDADES.map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              {p}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="responsavel_nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do responsável" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="data_fechamento_prevista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fechamento previsto</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {status === "perdido" ? (
                <FormField
                  control={form.control}
                  name="motivo_perda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da perda *</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um motivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OPPORTUNITY_MOTIVOS_PERDA.map((m) => (
                            <SelectItem key={m} value={m}>
                              {OPPORTUNITY_MOTIVO_PERDA_LABEL[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

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
                {isEdit ? "Salvar" : "Criar oportunidade"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
