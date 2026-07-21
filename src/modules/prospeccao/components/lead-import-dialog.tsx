import { useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { useCurrentWorkspaceId, getCurrentUserName } from "@/lib/workspace";
import { useQueryClient } from "@tanstack/react-query";

import { leadsKeys } from "../hooks/use-leads";
import {
  commitCsvImport,
  loadExistingLeads,
  previewCsvImport,
  type ImportPreview,
  type ImportRow,
  type ImportRowStatus,
} from "../services/lead-import.service";

const STATUS_TONE: Record<ImportRowStatus, StatusTone> = {
  novo: "success",
  duplicado: "warning",
  invalido: "destructive",
  ignorado: "neutral",
};

const STATUS_LABEL: Record<ImportRowStatus, string> = {
  novo: "Pronto",
  duplicado: "Duplicado",
  invalido: "Erro",
  ignorado: "Ignorado",
};

type FilterKey = "todos" | ImportRowStatus | "corrigidos";

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
  const [mergeDuplicates, setMergeDuplicates] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("todos");

  const filteredRows = useMemo<ImportRow[]>(() => {
    if (!preview) return [];
    if (filter === "todos") return preview.rows;
    if (filter === "corrigidos")
      return preview.rows.filter((r) => r.corrections.length > 0);
    return preview.rows.filter((r) => r.status === filter);
  }, [preview, filter]);

  const totalToImport = useMemo(() => {
    if (!preview) return 0;
    const base = preview.totalNovos;
    return mergeDuplicates
      ? base + preview.rows.filter((r) => r.status === "duplicado" && r.duplicateLeadId).length
      : base;
  }, [preview, mergeDuplicates]);

  const disabledCommit = !preview || totalToImport === 0;

  function reset() {
    setFileName(null);
    setCsvText("");
    setPreview(null);
    setDefaultResponsavel(defaultUser);
    setMergeDuplicates(false);
    setFilter("todos");
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
      const res = await commitCsvImport(workspaceId, preview.rows, { mergeDuplicates });
      const parts = [`${res.created} novos`];
      if (res.merged > 0) parts.push(`${res.merged} mesclados`);
      toast.success(`Importação: ${parts.join(", ")}`);
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar leads</DialogTitle>
          <DialogDescription>
            Envie um CSV do Google Maps / Thunderbit ou layout Growth OS. Revise as
            classificações antes de importar.
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
                Analisados: {preview.totalAnalisados}
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
                🔁 Duplicados: {preview.totalDuplicados}
              </StatusBadge>
              <StatusBadge tone="destructive">
                ❌ Erros: {preview.totalInvalidos}
              </StatusBadge>
              <StatusBadge tone="neutral">
                ⛔ Ignorados: {preview.totalIgnorados}
              </StatusBadge>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="todos">Todos ({preview.rows.length})</TabsTrigger>
                <TabsTrigger value="novo">Prontos ({preview.totalNovos})</TabsTrigger>
                <TabsTrigger value="corrigidos">
                  Corrigidos ({preview.totalCorrigidos})
                </TabsTrigger>
                <TabsTrigger value="duplicado">
                  Duplicados ({preview.totalDuplicados})
                </TabsTrigger>
                <TabsTrigger value="invalido">
                  Erros ({preview.totalInvalidos})
                </TabsTrigger>
                <TabsTrigger value="ignorado">
                  Ignorados ({preview.totalIgnorados})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {preview.totalDuplicados > 0 ? (
              <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Checkbox
                  checked={mergeDuplicates}
                  onCheckedChange={(v) => setMergeDuplicates(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium">Mesclar dados nos duplicados existentes</p>
                  <p className="text-xs text-muted-foreground">
                    Atualiza leads já cadastrados preenchendo campos vazios com os
                    novos dados. Não sobrescreve valores existentes.
                  </p>
                </div>
              </label>
            ) : null}

            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">Empresa</th>
                    <th className="px-2 py-2 text-left">Cidade/UF</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                        Nenhum registro nesta categoria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr key={r.index} className="border-t align-top">
                        <td className="px-2 py-1.5 text-muted-foreground">{r.index}</td>
                        <td className="px-2 py-1.5">
                          {r.data.nome_empresa ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {[r.data.cidade, r.data.estado].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <StatusBadge tone={STATUS_TONE[r.status]}>
                            {STATUS_LABEL[r.status]}
                          </StatusBadge>
                        </td>
                        <td className="px-2 py-1.5 text-xs text-muted-foreground">
                          {r.status === "ignorado" ? (
                            <span>⛔ {r.ignoredReason}</span>
                          ) : r.status === "duplicado" ? (
                            <div className="space-y-0.5">
                              <div>🔁 {r.duplicateReason}</div>
                              {r.duplicateLeadName ? (
                                <div className="text-muted-foreground/80">
                                  Já cadastrado como:{" "}
                                  <span className="font-medium">{r.duplicateLeadName}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : r.status === "invalido" ? (
                            <span>❌ {r.errors.join(", ")}</span>
                          ) : r.corrections.length > 0 ? (
                            <span>⚠️ {r.corrections.join(", ")}</span>
                          ) : (
                            ""
                          )}
                        </td>
                      </tr>
                    ))
                  )}
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
            Importar {totalToImport} lead{totalToImport === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
