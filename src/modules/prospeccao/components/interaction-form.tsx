import { useState } from "react";
import { Loader2, MessageSquareText, Plus } from "lucide-react";
import { toast } from "sonner";

import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";
import { TemplatePickerDialog } from "@/modules/message-templates";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useCreateLeadInteraction } from "../hooks/use-lead-interactions";
import {
  LEAD_INTERACTION_TYPES,
  LEAD_INTERACTION_TYPE_LABEL,
  type LeadInteractionType,
} from "../types/entities.types";

function nowLocal(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

import type { Lead } from "../types/leads.types";

export function InteractionForm({
  leadId,
  lead,
  disabled,
}: {
  leadId: string;
  lead?: Lead;
  disabled?: boolean;
}) {
  const role = useCurrentRole();
  const canUseTemplates = can(role, "mensagens:view");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tipo, setTipo] = useState<LeadInteractionType>("nota");
  const [data, setData] = useState<string>(nowLocal());
  const [descricao, setDescricao] = useState("");
  const create = useCreateLeadInteraction(leadId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Descreva a interação.");
      return;
    }
    try {
      await create.mutateAsync({
        tipo,
        data: new Date(data).toISOString(),
        descricao: descricao.trim(),
      });
      toast.success("Interação registrada");
      setDescricao("");
      setData(nowLocal());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as LeadInteractionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_INTERACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LEAD_INTERACTION_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="datetime-local"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que aconteceu? Próximos passos?"
            />
          </div>
          <div className="flex justify-between gap-2">
            {lead && canUseTemplates ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setPickerOpen(true)}
              >
                <MessageSquareText className="h-4 w-4" />
                Usar mensagem
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" disabled={disabled || create.isPending} className="gap-2">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Registrar
            </Button>
          </div>
        </form>
      </CardContent>
      {lead && (
        <TemplatePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} lead={lead} />
      )}
    </Card>
  );
}

