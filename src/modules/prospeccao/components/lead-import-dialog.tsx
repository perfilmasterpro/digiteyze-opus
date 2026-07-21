import { useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { useCurrentWorkspaceId, getCurrentUserName } from "@/lib/workspace";
import { useQueryClient } from "@tanstack/react-query";

import { leadsKeys } from "../hooks/use-leads";
import {
  commitCsvImport,
  loadExistingLeads,
  previewCsvImport,
  type ImportPreview,
  type ImportRowStatus,
} from "../services/lead-import.service";

const STATUS_TONE: Record<ImportRowStatus, StatusTone> = {
  novo: "success",
  duplicado: "warning",
  invalido: "destructive",
};

const STATUS_LABEL: Record<ImportRowStatus, string> = {
  novo: "Novo",
  duplicado: "Duplicado",
  invalido: "Inválido",
};

export function LeadImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  const defaultUser = (() => {
    try { return getCurrentUserName(); } catch { return ""; }
  })();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [defaultResponsavel, setDefaultResponsavel] = useState(defaultUser);
  const [busy, setBusy] = useState(false);

  const disabledCommit = useMemo(
    () => !preview || preview.totalNovos === 0,
    [preview],
  );

  function reset() {
    setFileName(null);
    setCsvText("");
    setPreview(null);
    setDefaultResponsavel(defaultUser);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
    const existing = await loadExistingLeads(workspaceId);
    setPreview(previewCsvImport(text, existing, { responsavel: defaultResponsavel }));
  }

  async function recompute() {
    if (!csvText) return;
    const existing = await loadExistingLeads(workspaceId);
    setPreview(previewCsvImport(csvText, existing, { responsavel: defaultResponsavel }));
  }

  async function handleCommit() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await commitCsvImport(workspaceId, preview.rows);
      toast.success(`${res.created} leads importados`);
      qc.invalidateQueries({ queryKey: leadsKeys.all(workspaceId) });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar leads</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV com cabeçalho. Colunas aceitas: nome_empresa,
            segmento, cidade, estado, site, instagram, telefone, whatsapp,
            email, contato_nome, contato_cargo, origem, responsavel, cnpj,
            observacoes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="csv">Arquivo CSV</Label>
            <Input
              id="csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {fileName ? (
              <p className="text-xs text-muted-foreground">Arquivo: {fileName}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="resp">Responsável padrão</Label>
            <Input
              id="resp"
              placeholder="Aplicado a linhas sem responsável"
              value={defaultResponsavel}
              onChange={(e) => setDefaultResponsavel(e.target.value)}
              onBlur={recompute}
            />
          </div>
        </div>

        {preview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge tone="info">Layout: {preview.profileLabel}</StatusBadge>
              <StatusBadge tone="neutral">
                Total analisados: {preview.totalAnalisados}
              </StatusBadge>
              <StatusBadge tone="success">
                ✅ Prontos: {preview.totalNovos}
              </StatusBadge>
              {preview.totalCorrigidos > 0 ? (
                <StatusBadge tone="info">
                  ⚠️ Corrigidos: {preview.totalCorrigidos}
                </StatusBadge>
              ) : null}
              <StatusBadge tone="warning">
                Duplicados: {preview.totalDuplicados}
              </StatusBadge>
              <StatusBadge tone="destructive">
                ❌ Erros: {preview.totalInvalidos}
              </StatusBadge>
              {preview.totalIgnorados > 0 ? (
                <StatusBadge tone="neutral">
                  ⛔ Anúncios ignorados: {preview.totalIgnorados}
                </StatusBadge>
              ) : null}
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">Empresa</th>
                    <th className="px-2 py-2 text-left">Cidade/UF</th>
                    <th className="px-2 py-2 text-left">Origem</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.index} className="border-t">
                      <td className="px-2 py-1.5 text-muted-foreground">{r.index}</td>
                      <td className="px-2 py-1.5">
                        {r.data.nome_empresa ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {[r.data.cidade, r.data.estado].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-2 py-1.5">{r.data.origem ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <StatusBadge tone={STATUS_TONE[r.status]}>
                          {STATUS_LABEL[r.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">
                        {r.duplicateReason ??
                          (r.errors.length
                            ? r.errors.join(", ")
                            : r.corrections.length
                              ? r.corrections.join(", ")
                              : "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCommit}
            disabled={disabledCommit || busy}
            className="gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importar {preview?.totalNovos ?? 0} leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
