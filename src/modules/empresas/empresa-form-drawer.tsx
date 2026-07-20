import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

import { empresaSchema, type EmpresaFormValues } from "./empresas.schema";
import {
  EMPRESA_ORIGENS,
  EMPRESA_ORIGEM_LABEL,
  EMPRESA_STATUS,
  EMPRESA_STATUS_LABEL,
  EMPRESA_TIPOS,
  EMPRESA_TIPO_LABEL,
  type Empresa,
  type EmpresaInput,
} from "./empresas.types";
import { useCreateEmpresa, useUpdateEmpresa } from "./use-empresas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
};

const EMPTY: EmpresaFormValues = {
  nome: "",
  tipo: "cliente",
  status: "ativo",
  responsavel: "",
  origem: "indicacao",
  documento: "",
  site: "",
  email: "",
  telefone: "",
  segmento: "",
  cidade: "",
  estado: "",
  observacoes: "",
};

export function EmpresaFormDrawer({ open, onOpenChange, empresa }: Props) {
  const isEdit = Boolean(empresa);
  const create = useCreateEmpresa();
  const update = useUpdateEmpresa();
  const [openOpcionais, setOpenOpcionais] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(empresa ? toFormValues(empresa) : EMPTY);
      setOpenOpcionais(false);
    }
  }, [open, empresa, form]);

  const submitting = create.isPending || update.isPending;

  async function onSubmit(values: EmpresaFormValues) {
    const input = toInput(values);
    try {
      if (empresa) {
        await update.mutateAsync({ id: empresa.id, input });
        toast.success("Empresa atualizada");
      } else {
        await create.mutateAsync(input);
        toast.success("Empresa criada");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && form.formState.isDirty && !submitting) {
      setConfirmCancel(true);
      return;
    }
    onOpenChange(next);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b p-6">
            <SheetTitle>{isEdit ? "Editar empresa" : "Nova empresa"}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? "Atualize os dados da empresa."
                : "Preencha os dados essenciais. Dados adicionais podem ser preenchidos depois."}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <section className="space-y-4">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Etapa 1 — Essenciais
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Campos obrigatórios para cadastro rápido.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Digiteyze" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EMPRESA_TIPOS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {EMPRESA_TIPO_LABEL[t]}
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
                              {EMPRESA_STATUS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {EMPRESA_STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="responsavel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do responsável" {...field} />
                          </FormControl>
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
                              {EMPRESA_ORIGENS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {EMPRESA_ORIGEM_LABEL[o]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <Collapsible open={openOpcionais} onOpenChange={setOpenOpcionais}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span>
                        Etapa 2 — Dados adicionais{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          (opcional)
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${openOpcionais ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="documento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Documento (CNPJ/CPF)</FormLabel>
                            <FormControl>
                              <Input placeholder="00.000.000/0000-00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="segmento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Segmento</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex.: Tecnologia" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="site"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site</FormLabel>
                            <FormControl>
                              <Input placeholder="https://" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contato@empresa.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="UF" {...field} />
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
                            <Textarea rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isEdit ? "Salvar alterações" : "Criar empresa"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Descartar alterações?"
        description="Você tem alterações não salvas. Deseja realmente fechar?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        destructive
        onConfirm={() => {
          setConfirmCancel(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

function toFormValues(e: Empresa): EmpresaFormValues {
  return {
    nome: e.nome,
    tipo: e.tipo,
    status: e.status,
    responsavel: e.responsavel,
    origem: e.origem,
    documento: e.documento ?? "",
    site: e.site ?? "",
    email: e.email ?? "",
    telefone: e.telefone ?? "",
    segmento: e.segmento ?? "",
    cidade: e.cidade ?? "",
    estado: e.estado ?? "",
    observacoes: e.observacoes ?? "",
  };
}

function toInput(v: EmpresaFormValues): EmpresaInput {
  const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return {
    nome: v.nome.trim(),
    tipo: v.tipo,
    status: v.status,
    responsavel: v.responsavel.trim(),
    origem: v.origem,
    documento: clean(v.documento),
    site: clean(v.site),
    email: clean(v.email),
    telefone: clean(v.telefone),
    segmento: clean(v.segmento),
    cidade: clean(v.cidade),
    estado: clean(v.estado),
    observacoes: clean(v.observacoes),
  };
}
