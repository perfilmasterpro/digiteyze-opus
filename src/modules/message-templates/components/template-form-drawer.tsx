import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useActiveMessageCategories } from "../hooks/use-message-categories";
import { useCreateTemplate, useUpdateTemplate } from "../hooks/use-message-templates";
import {
  messageTemplateSchema,
  type MessageTemplateFormValues,
} from "../schemas/message-templates.schema";
import { extractTokens } from "../services/apply-variables";
import {
  MESSAGE_TEMPLATE_VARIABLES,
  formatCategoriaLabel,
  type MessageTemplate,
} from "../types/message-templates.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
};

export function TemplateFormDrawer({ open, onOpenChange, template }: Props) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const categories = useActiveMessageCategories();
  const editing = Boolean(template);

  const defaultSlug = categories[0]?.slug ?? "prospeccao";

  const form = useForm<MessageTemplateFormValues>({
    resolver: zodResolver(messageTemplateSchema),
    defaultValues: {
      titulo: "",
      categoria: defaultSlug,
      corpo: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        titulo: template?.titulo ?? "",
        categoria: template?.categoria ?? defaultSlug,
        corpo: template?.corpo ?? "",
        ativo: template?.ativo ?? true,
      });
    }
  }, [open, template, form]);

  const corpo = form.watch("corpo");
  const tokens = extractTokens(corpo ?? "");

  async function onSubmit(values: MessageTemplateFormValues) {
    try {
      if (template) {
        await update.mutateAsync({ id: template.id, input: values });
        toast.success("Mensagem atualizada");
      } else {
        await create.mutateAsync(values);
        toast.success("Mensagem criada");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar mensagem");
    }
  }

  function insertToken(token: string) {
    const current = form.getValues("corpo") ?? "";
    form.setValue("corpo", `${current}${current.endsWith(" ") || !current ? "" : " "}{{${token}}}`, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const pending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-6">
          <SheetTitle>{editing ? "Editar mensagem" : "Nova mensagem"}</SheetTitle>
          <SheetDescription>
            Modelos ficam disponíveis para todo o workspace. Use variáveis como{" "}
            <code className="rounded bg-muted px-1">{"{{nome_empresa}}"}</code>.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <div className="space-y-1.5">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" {...form.register("titulo")} placeholder="Ex.: Abertura outbound" />
                {form.formState.errors.titulo && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.titulo.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.watch("categoria")}
                  onValueChange={(v) =>
                    form.setValue("categoria", v as MessageTemplateFormValues["categoria"], {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: c.cor }}
                          />
                          {c.nome}
                        </span>
                      </SelectItem>
                    ))}
                    {template && !categories.some((c) => c.slug === template.categoria) && (
                      <SelectItem value={template.categoria}>
                        {formatCategoriaLabel(template.categoria)} (legada)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corpo">Mensagem</Label>
              <Textarea
                id="corpo"
                rows={10}
                {...form.register("corpo")}
                placeholder={"Olá {{primeiro_nome}}, vi que a {{nome_empresa}} atua com {{segmento}}..."}
                className="font-mono text-sm"
              />
              {form.formState.errors.corpo && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.corpo.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Variáveis detectadas:{" "}
                {tokens.length === 0 ? (
                  <span className="italic">nenhuma</span>
                ) : (
                  tokens.map((t) => (
                    <code
                      key={t}
                      className="mr-1 rounded bg-muted px-1 py-0.5 text-[11px] text-foreground"
                    >
                      {`{{${t}}}`}
                    </code>
                  ))
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Inserir variável</Label>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_TEMPLATE_VARIABLES.map((v) => (
                  <Button
                    key={v.token}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => insertToken(v.token)}
                    className="h-7 text-xs"
                  >
                    {`{{${v.token}}}`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Mensagens inativas ficam ocultas no seletor da prospecção.
                </p>
              </div>
              <Switch
                checked={form.watch("ativo")}
                onCheckedChange={(v) => form.setValue("ativo", v, { shouldDirty: true })}
              />
            </div>
          </div>

          <SheetFooter className="border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar alterações" : "Criar mensagem"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
