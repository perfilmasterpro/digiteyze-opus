import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Contact,
  Download,
  FileStack,
  Handshake,
  Sparkles,
  Target,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { downloadLeadsBackup } from "@/lib/backup-leads";
import { getSuperAdminStats, migrateLeads } from "@/modules/super-admin";


export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const fn = useServerFn(getSuperAdminStats);
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "stats"],
    queryFn: () => fn(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Erro ao carregar KPIs: {(error as Error).message}</p>;
  }

  if (!data) return null;

  const items = [
    { label: "Workspaces", value: data.workspaces, icon: <Building2 className="h-4 w-4" /> },
    { label: "Usuários", value: data.users, icon: <Users className="h-4 w-4" /> },
    { label: "Empresas", value: data.empresas, icon: <Building2 className="h-4 w-4" /> },
    { label: "Leads", value: data.leads, icon: <Target className="h-4 w-4" /> },
    { label: "Oportunidades", value: data.opportunities, icon: <Sparkles className="h-4 w-4" /> },
    { label: "Propostas", value: data.proposals, icon: <FileStack className="h-4 w-4" /> },
    { label: "Contratos", value: data.contracts, icon: <Contact className="h-4 w-4" /> },
    { label: "Assinaturas", value: data.signatures, icon: <Handshake className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((it) => (
          <KpiCard key={it.label} label={it.label} value={it.value} icon={it.icon} />
        ))}
        <div className="col-span-2 md:col-span-4 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
          <Wallet className="mr-1 inline h-3 w-3" /> Visão global — atualiza sempre que a página é aberta.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeadsBackupCard />
        <LeadsMigrationCard />
      </div>
    </div>
  );
}


function LeadsBackupCard() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleBackup() {
    const result = downloadLeadsBackup();
    if (result.ok) {
      setMessage({
        type: "success",
        text: `${result.count} lead${result.count === 1 ? "" : "s"} encontrado${result.count === 1 ? "" : "s"}. Backup "${result.filename}" gerado com sucesso.`,
      });
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-4 w-4 text-primary" />
          Backup de Prospecção
        </CardTitle>
        <CardDescription>
          Exporte os leads armazenados localmente antes da migração para o banco de dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Os dados antigos do módulo Prospecção ainda estão na chave{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">growth-os:leads</code> do navegador.
          Clique abaixo para gerar o arquivo de backup.
        </p>
        <Button onClick={handleBackup} className="gap-2">
          <Download className="h-4 w-4" />
          Baixar backup dos leads
        </Button>
        {message ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border bg-muted p-3 text-sm text-foreground",
              message.type === "success" ? "border-success/30" : "border-destructive/30",
            )}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LeadsMigrationCard() {
  const migrate = useServerFn(migrateLeads);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<unknown[] | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    setFile(selected ?? null);
    setParsed(null);
    setMessage(null);

    if (!selected) return;

    try {
      const text = await selected.text();
      const json = JSON.parse(text) as unknown;
      if (!json || typeof json !== "object" || !Array.isArray((json as { leads?: unknown }).leads)) {
        setMessage({ type: "error", text: "O arquivo não possui a propriedade 'leads' como array." });
        return;
      }
      const leads = (json as { leads: unknown[] }).leads;
      setParsed(leads);
      setMessage({
        type: "success",
        text: `${leads.length} lead${leads.length === 1 ? "" : "s"} encontrado${leads.length === 1 ? "" : "s"} no backup.`,
      });
    } catch {
      setMessage({ type: "error", text: "Arquivo inválido. Selecione um JSON exportado pelo backup." });
    }
  }

  async function handleMigrate() {
    if (!parsed || parsed.length === 0) {
      setMessage({ type: "error", text: "Nenhum lead válido para migrar." });
      return;
    }

    setIsMigrating(true);
    setMessage(null);

    try {
      const result = await migrate({ data: { leads: parsed } });
      const text = [
        `${result.inserted} migrado${result.inserted === 1 ? "" : "s"} com sucesso.`,
        result.skipped > 0 ? `${result.skipped} ignorado${result.skipped === 1 ? "" : "s"}.` : "",
        result.errors.length > 0 ? `${result.errors.length} erro(s).` : "",
      ]
        .filter(Boolean)
        .join(" ");
      setMessage({ type: result.errors.length > 0 && result.inserted === 0 ? "error" : "success", text });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro inesperado na migração.",
      });
    } finally {
      setIsMigrating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4 text-primary" />
          Migrar Leads para o Banco
        </CardTitle>
        <CardDescription>
          Envie o arquivo de backup para importar os leads permanentemente no Supabase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Selecione o JSON gerado pelo card de backup. A migração só pode ser executada por super
          administradores e os leads serão vinculados aos workspaces informados no arquivo.
        </p>
        <Input type="file" accept="application/json" onChange={handleFileChange} />
        <Button onClick={handleMigrate} disabled={!parsed || isMigrating} className="gap-2">
          <Upload className="h-4 w-4" />
          {isMigrating ? "Migrando…" : "Migrar leads"}
        </Button>
        {message ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border bg-muted p-3 text-sm text-foreground",
              message.type === "success" ? "border-success/30" : "border-destructive/30",
            )}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

