import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

import { useUpdateLead } from "../hooks/use-leads";
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
  lead: Lead;
  onSaved?: () => void;
};

export function LeadEditForm({ lead, onSaved }: Props) {
  const update = useUpdateLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: toFormValues(lead),
  });

  useEffect(() => {
    form.reset(toFormValues(lead));
  }, [lead, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "custom_fields",
  });

  const status = form.watch("status");
  const isLost = status === "perdido";
  const submitting = update.isPending;

  async function onSubmit(values: LeadFormValues) {
    try {
      await update.mutateAsync({ id: lead.id, input: toInput(values) });
      toast.success("Lead atualizado");
      form.reset(values); // marca form como pristine
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Empresa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados da empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome_empresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da empresa *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <Input {...field} />
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
            <div className="grid gap-4 sm:grid-cols-3">
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
            </div>
          </CardContent>
        </Card>

        {/* Contato principal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contato principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contato_nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações comerciais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações comerciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
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
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
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
                    <FormLabel>Probabilidade</FormLabel>
                    <Select
                      value={typeof field.value === "number" ? String(field.value) : ""}
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
          </CardContent>
        </Card>

        {/* Próxima ação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Próxima ação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="proxima_acao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
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
                  <FormLabel>Data prevista</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={5} placeholder="Notas internas, contexto…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Campos personalizados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Campos personalizados</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Adicione informações extras que não se encaixam nos demais campos.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ key: "", value: "" })}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum campo personalizado.</p>
            ) : (
              fields.map((row, index) => (
                <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <FormField
                    control={form.control}
                    name={`custom_fields.${index}.key` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Rótulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`custom_fields.${index}.value` as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Valor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label="Remover campo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(toFormValues(lead))}
            disabled={submitting || !form.formState.isDirty}
          >
            Descartar alterações
          </Button>
          <Button type="submit" disabled={submitting || !form.formState.isDirty}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      </form>
    </Form>
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
    custom_fields: l.custom_fields
      ? Object.entries(l.custom_fields).map(([key, value]) => ({ key, value }))
      : [],
  };
}

function toInput(v: LeadFormValues): LeadInput {
  const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  const cf = (v.custom_fields ?? [])
    .map((f) => [f.key.trim(), f.value.trim()] as const)
    .filter(([k, val]) => k.length > 0 && val.length > 0);
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
      typeof v.probabilidade_fechamento === "number" &&
      !Number.isNaN(v.probabilidade_fechamento)
        ? (v.probabilidade_fechamento as LeadProbabilidade)
        : undefined,
    motivo_perda:
      v.status === "perdido"
        ? ((v.motivo_perda || undefined) as LeadMotivoPerda | undefined)
        : undefined,
    custom_fields: cf.length > 0 ? Object.fromEntries(cf) : undefined,
  };
}
