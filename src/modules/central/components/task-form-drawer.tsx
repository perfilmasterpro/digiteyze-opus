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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useCreateTask, useUpdateTask } from "../hooks/use-tasks";
import { taskSchema, type TaskFormValues } from "../schemas/central.schemas";
import {
  RECURRENCE_FREQS,
  RECURRENCE_FREQ_LABEL,
  TASK_CATEGORIAS,
  TASK_CATEGORIA_LABEL,
  TASK_PRIORIDADES,
  TASK_PRIORIDADE_LABEL,
  TASK_STATUS,
  TASK_STATUS_LABEL,
  type Task,
  type TaskInput,
} from "../types/central.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaults?: Partial<TaskInput>;
};

function toDefaults(task: Task | null | undefined, defaults?: Partial<TaskInput>): TaskFormValues {
  if (task) {
    return {
      titulo: task.titulo,
      descricao: task.descricao,
      categoria: task.categoria,
      status: task.status,
      prioridade: task.prioridade,
      origem: task.origem,
      origem_ref_tipo: task.origem_ref_tipo,
      origem_ref_id: task.origem_ref_id,
      modulo_relacionado: task.modulo_relacionado,
      projeto: task.projeto,
      responsavel_id: task.responsavel_id,
      data: task.data,
      data_inicio: task.data_inicio,
      hora_inicio: task.hora_inicio?.slice(0, 5) ?? null,
      hora_fim: task.hora_fim?.slice(0, 5) ?? null,
      prazo: task.prazo,
      observacoes: task.observacoes,
      recurrence_rule: task.recurrence_rule,
    };
  }
  return {
    titulo: "",
    descricao: null,
    categoria: defaults?.categoria ?? "administrativo",
    status: "pendente",
    prioridade: defaults?.prioridade ?? "media",
    origem: defaults?.origem ?? "manual",
    origem_ref_tipo: defaults?.origem_ref_tipo ?? null,
    origem_ref_id: defaults?.origem_ref_id ?? null,
    modulo_relacionado: defaults?.modulo_relacionado ?? null,
    projeto: defaults?.projeto ?? null,
    responsavel_id: null,
    data: defaults?.data ?? null,
    data_inicio: defaults?.data_inicio ?? null,
    hora_inicio: null,
    hora_fim: null,
    prazo: null,
    observacoes: null,
    recurrence_rule: null,
  };
}

export function TaskFormDrawer({ open, onOpenChange, task, defaults }: Props) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEdit = Boolean(task?.id);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: toDefaults(task, defaults),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults(task, defaults));
  }, [open, task, defaults, form]);

  const recurrenceEnabled = Boolean(form.watch("recurrence_rule"));
  const recurrenceFreq = form.watch("recurrence_rule")?.freq ?? "daily";

  async function onSubmit(values: TaskFormValues) {
    try {
      const input = values as unknown as TaskInput;
      if (isEdit && task) {
        await updateTask.mutateAsync({ id: task.id, patch: input });
        toast.success("Tarefa atualizada");
      } else {
        await createTask.mutateAsync(input);
        toast.success("Tarefa criada");
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar";
      toast.error(msg);
    }
  }

  const submitting = createTask.isPending || updateTask.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar tarefa" : "Nova tarefa"}</SheetTitle>
          <SheetDescription>
            Registre o que precisa ser feito e organize sua agenda do dia.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Enviar proposta para X" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {TASK_CATEGORIA_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORIDADES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {TASK_PRIORIDADE_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {TASK_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projeto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projeto</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        placeholder="Ex: Prosperar, Growth OS, Digiteyze"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hora_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hora_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de início</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo final</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {task ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-y-1">
                  <span>Criada em:</span>
                  <span className="text-right text-foreground">
                    {new Date(task.created_at).toLocaleString("pt-BR")}
                  </span>
                  <span>Concluída em:</span>
                  <span className="text-right text-foreground">
                    {task.completed_at
                      ? new Date(task.completed_at).toLocaleString("pt-BR")
                      : "—"}
                  </span>
                  <span>Repetição:</span>
                  <span className="text-right text-foreground">
                    {task.recurrence_rule
                      ? `${RECURRENCE_FREQ_LABEL[task.recurrence_rule.freq]} · a cada ${task.recurrence_rule.interval}`
                      : "Não repetir"}
                  </span>
                </div>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      rows={3}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Recorrência */}
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Repetir tarefa</p>
                  <p className="text-xs text-muted-foreground">
                    Ao concluir, uma nova instância será gerada automaticamente.
                  </p>
                </div>
                <Switch
                  checked={recurrenceEnabled}
                  onCheckedChange={(checked) => {
                    form.setValue(
                      "recurrence_rule",
                      checked ? { freq: "weekly", interval: 1 } : null,
                    );
                  }}
                />
              </div>

              {recurrenceEnabled ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select
                      value={recurrenceFreq}
                      onValueChange={(freq) =>
                        form.setValue("recurrence_rule", {
                          ...(form.getValues("recurrence_rule") ?? { interval: 1 }),
                          freq: freq as (typeof RECURRENCE_FREQS)[number],
                          interval:
                            form.getValues("recurrence_rule")?.interval ?? 1,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_FREQS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {RECURRENCE_FREQ_LABEL[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <FormItem>
                    <FormLabel>A cada</FormLabel>
                    <Input
                      type="number"
                      min={1}
                      value={form.watch("recurrence_rule")?.interval ?? 1}
                      onChange={(e) =>
                        form.setValue("recurrence_rule", {
                          ...(form.getValues("recurrence_rule") ?? { freq: "weekly" }),
                          freq: form.getValues("recurrence_rule")?.freq ?? "weekly",
                          interval: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                  </FormItem>
                </div>
              ) : null}
            </div>

            <SheetFooter className="mt-4 flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Salvando
                  </>
                ) : isEdit ? (
                  "Salvar"
                ) : (
                  "Criar tarefa"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
