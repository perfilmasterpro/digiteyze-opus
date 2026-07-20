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

import { useCreateLead, useUpdateLead } from "../hooks/use-leads";
import { leadSchema, type LeadFormValues } from "../schemas/leads.schema";
import {
  LEAD_CANAIS,
  LEAD_CANAL_LABEL,
  LEAD_MOTIVOS_PERDA,
  LEAD_MOTIVO_PERDA_LABEL,
  LEAD_ORIGENS,
  LEAD_ORIGEM_LABEL,
  LEAD_PORTES,
  LEAD_PORTE_LABEL,
  LEAD_PROBABILIDADES,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURAS,
  LEAD_TEMPERATURA_LABEL,
  UFS,
  type Lead,
  type LeadCanal,
  type LeadInput,
  type LeadMotivoPerda,
  type LeadPorte,
  type LeadProbabilidade,
  type LeadTemperatura,
  type UF,
} from "../types/leads.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
};

const EMPTY: LeadFormValues = {
  nome_empresa: "",
  status: "novo_lead",
  origem: "inbound",
  responsavel: "",
  contato_nome: "",
  contato_cargo: "",
  contato_email: "",
  telefone: "",
  cnpj: "",
  segmento: "",
  porte: "",
  temperatura: "",
  valor_potencial: undefined,
  cidade: "",
  estado: "",
  site: "",
  instagram: "",
  whatsapp: "",
  observacoes: "",
  proxima_acao: "",
  data_proxima_acao: "",
  canal_aquisicao: "",
  probabilidade_fechamento: undefined,
  motivo_perda: "",
};

export function LeadFormDrawer({ open, onOpenChange, lead }: Props) {
  const isEdit = Boolean(lead);
  const create = useCreateLead();
  const update = useUpdateLead();
  const [openOpcionais, setOpenOpcionais] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(lead ? toFormValues(lead) : EMPTY);
      setOpenOpcionais(false);
    }
  }, [open, lead, form]);

  const submitting = create.isPending || update.isPending;
  const status = form.watch("status");
  const isLost = status === "perdido";

  async function onSubmit(values: LeadFormValues) {
    const input = toInput(values);
    try {
      if (lead) {
        await update.mutateAsync({ id: lead.id, input });
        toast.success("Lead atualizado");
      } else {
        await create.mutateAsync(input);
        toast.success("Lead criado");
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
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b p-6">
            <SheetTitle>{isEdit ? "Editar lead" : "Novo lead"}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? "Atualize os dados do lead."
                : "Preencha os dados essenciais. Dados adicionais podem ser preenchidos depois."}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Etapa 1 — Essenciais */}
                <section className="space-y-4">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Etapa 1 — Essenciais
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Empresa, contato principal e classificação inicial.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="nome_empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da empresa *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Acme Ltda" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
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
                              {LEAD_STATUS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {LEAD_STATUS_LABEL[s]}
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
                              {LEAD_ORIGENS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {LEAD_ORIGEM_LABEL[o]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contato_nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contato principal</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do contato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contato_cargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: Diretor Comercial" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contato_email"
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
                  </div>
                </section>

                {/* Etapa 2 — Complementares */}
                <Collapsible open={openOpcionais} onOpenChange={setOpenOpcionais}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span>
                        Etapa 2 — Dados complementares{" "}
                        <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
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
                        name="cnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ</FormLabel>
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
                              <Input placeholder="Ex.: Varejo, SaaS…" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="porte"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Porte</FormLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v as LeadPorte)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LEAD_PORTES.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {LEAD_PORTE_LABEL[p]}
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
                        name="temperatura"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperatura</FormLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v as LeadTemperatura)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LEAD_TEMPERATURAS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {LEAD_TEMPERATURA_LABEL[t]}
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
                        name="valor_potencial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor potencial (R$)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={
                                  field.value === undefined || Number.isNaN(field.value as number)
                                    ? ""
                                    : String(field.value)
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(v === "" ? undefined : Number(v));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Sprint 3.3: campos comerciais */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="canal_aquisicao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canal de aquisição</FormLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v as LeadCanal)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LEAD_CANAIS.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {LEAD_CANAL_LABEL[c]}
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
                        name="probabilidade_fechamento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Probabilidade de fechamento</FormLabel>
                            <Select
                              value={
                                typeof field.value === "number" ? String(field.value) : ""
                              }
                              onValueChange={(v) =>
                                field.onChange(v === "" ? undefined : (Number(v) as LeadProbabilidade))
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LEAD_PROBABILIDADES.map((p) => (
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

                    {isLost ? (
                      <FormField
                        control={form.control}
                        name="motivo_perda"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivo de perda</FormLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v as LeadMotivoPerda)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LEAD_MOTIVOS_PERDA.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {LEAD_MOTIVO_PERDA_LABEL[m]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
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
                            <FormLabel>UF</FormLabel>
                            <Select
                              value={field.value ?? ""}
                              onValueChange={(v) => field.onChange(v as UF)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {UFS.map((uf) => (
                                  <SelectItem key={uf} value={uf}>
                                    {uf}
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
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@usuario" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="proxima_acao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Próxima ação</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex.: Enviar proposta" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="data_proxima_acao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data da próxima ação</FormLabel>
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
                  {isEdit ? "Salvar alterações" : "Criar lead"}
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

function toFormValues(l: Lead): LeadFormValues {
  return {
    nome_empresa: l.nome_empresa,
    status: l.status,
    origem: l.origem,
    responsavel: l.responsavel,
    contato_nome: l.contato_nome ?? "",
    contato_cargo: l.contato_cargo ?? "",
    contato_email: l.contato_email ?? "",
    telefone: l.telefone ?? "",
    cnpj: l.cnpj ?? "",
    segmento: l.segmento ?? "",
    porte: l.porte ?? "",
    temperatura: l.temperatura ?? "",
    valor_potencial: l.valor_potencial,
    cidade: l.cidade ?? "",
    estado: l.estado ?? "",
    site: l.site ?? "",
    instagram: l.instagram ?? "",
    whatsapp: l.whatsapp ?? "",
    observacoes: l.observacoes ?? "",
    proxima_acao: l.proxima_acao ?? "",
    data_proxima_acao: l.data_proxima_acao ?? "",
    canal_aquisicao: l.canal_aquisicao ?? "",
    probabilidade_fechamento: l.probabilidade_fechamento,
    motivo_perda: l.motivo_perda ?? "",
  };
}

function toInput(v: LeadFormValues): LeadInput {
  const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return {
    nome_empresa: v.nome_empresa.trim(),
    status: v.status,
    origem: v.origem,
    responsavel: v.responsavel.trim(),
    contato_nome: clean(v.contato_nome),
    contato_cargo: clean(v.contato_cargo),
    contato_email: clean(v.contato_email),
    telefone: clean(v.telefone),
    cnpj: clean(v.cnpj),
    segmento: clean(v.segmento),
    porte: (v.porte || undefined) as LeadPorte | undefined,
    temperatura: (v.temperatura || undefined) as LeadTemperatura | undefined,
    valor_potencial:
      typeof v.valor_potencial === "number" && !Number.isNaN(v.valor_potencial)
        ? v.valor_potencial
        : undefined,
    cidade: clean(v.cidade),
    estado: (v.estado || undefined) as UF | undefined,
    site: clean(v.site),
    instagram: clean(v.instagram),
    whatsapp: clean(v.whatsapp),
    observacoes: clean(v.observacoes),
    proxima_acao: clean(v.proxima_acao),
    data_proxima_acao: clean(v.data_proxima_acao),
    canal_aquisicao: (v.canal_aquisicao || undefined) as LeadCanal | undefined,
    probabilidade_fechamento:
      typeof v.probabilidade_fechamento === "number" && !Number.isNaN(v.probabilidade_fechamento)
        ? (v.probabilidade_fechamento as LeadProbabilidade)
        : undefined,
    motivo_perda:
      v.status === "perdido"
        ? ((v.motivo_perda || undefined) as LeadMotivoPerda | undefined)
        : undefined,
  };
}
