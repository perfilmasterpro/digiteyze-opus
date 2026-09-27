import { CheckCircle2, Loader2, QrCode, RefreshCw, Save, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspaceId } from "@/lib/workspace";

type MaskedConfig = {
  apiKey: string;
  apiSecret: string;
  instanceId: string;
  baseUrl: string;
  hasWebhookSecret: boolean;
  configured: boolean;
  source: "db" | "env";
};

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sua sessão expirou. Faça login novamente.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Card de configuração da integração ZapZap (aba Configurações → Integrações).
 *
 * Credenciais key/secret são exibidas mascaradas (só os últimos dígitos). Ao
 * salvar, campos deixados EM BRANCO preservam o valor atual (merge parcial no
 * servidor) — a cliente não precisa redigitar o secret para trocar só o
 * instance ID ou a base URL.
 */
export function ZapZapIntegrationCard() {
  const workspaceId = useCurrentWorkspaceId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MaskedConfig | null>(null);

  // Campos do formulário. Ficam vazios: em branco = "manter o atual".
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  // Estado do QR
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `/api/integracoes/zapzap-config?workspace_id=${encodeURIComponent(workspaceId)}`,
        { method: "GET", headers },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Falha ao carregar a configuração.");
      }
      setConfig(payload.config as MaskedConfig);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar a configuração.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/integracoes/zapzap-config", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspace_id: workspaceId,
          api_key: apiKey.trim() || undefined,
          api_secret: apiSecret.trim() || undefined,
          instance_id: instanceId.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar a configuração.");
      }
      setConfig(payload.config as MaskedConfig);
      // Limpa os inputs: o que foi salvo agora aparece mascarado no resumo.
      setApiKey("");
      setApiSecret("");
      setInstanceId("");
      setBaseUrl("");
      toast.success("Configuração do ZapZap salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a configuração.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateQr() {
    if (!workspaceId) return;
    setQrLoading(true);
    setQrImage(null);
    setConnected(false);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/integracoes/zapzap-qr", {
        method: "POST",
        headers,
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Falha ao gerar o QR.");
      }
      if (payload.connected) {
        setConnected(true);
        toast.success("Instância já conectada ao WhatsApp.");
        return;
      }
      const raw = String(payload.qrcode ?? "");
      const src = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
      setQrImage(src);
      toast.success("QR gerado. Escaneie no WhatsApp em até 60s.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o QR.");
    } finally {
      setQrLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumo do estado atual */}
      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração...
          </span>
        ) : config?.configured ? (
          <>
            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Configurado
            </Badge>
            <span className="text-xs text-muted-foreground">
              Fonte: {config.source === "db" ? "este workspace" : "variáveis de ambiente"}
            </span>
          </>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" /> Não configurado
          </Badge>
        )}
      </div>

      {/* Formulário de credenciais */}
      <div className="rounded-md border p-4">
        <h4 className="text-sm font-medium">Credenciais da API</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Deixe um campo em branco para manter o valor atual. Só o que for
          preenchido é atualizado.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="zz-key">API Key</Label>
            <Input
              id="zz-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.apiKey || "Cole a x-api-key do ZapZap"}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zz-secret">API Secret</Label>
            <Input
              id="zz-secret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={config?.apiSecret || "Cole a x-api-secret do ZapZap"}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zz-instance">Instance ID</Label>
            <Input
              id="zz-instance"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              placeholder={config?.instanceId || "ID da instância no painel ZapZap"}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zz-base">Base URL (opcional)</Label>
            <Input
              id="zz-base"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={config?.baseUrl || "https://api.zapzapapi.com"}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Conexão via QR */}
      <div className="rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Conexão do WhatsApp</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gere o QR e escaneie no aparelho para conectar a instância.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerateQr}
            disabled={qrLoading || loading || !config?.configured}
            className="gap-2"
          >
            {qrLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : qrImage ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            {qrImage ? "Gerar novo QR" : "Gerar QR"}
          </Button>
        </div>

        {!config?.configured && (
          <p className="mt-3 text-xs text-muted-foreground">
            Configure e salve as credenciais acima para habilitar a conexão.
          </p>
        )}

        {connected && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Instância já conectada — nenhum QR necessário.
          </div>
        )}

        {qrImage && !connected && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <img
              src={qrImage}
              alt="QR code de conexão do WhatsApp"
              className="h-56 w-56 rounded-md border bg-white p-2"
            />
            <p className="text-xs text-muted-foreground">
              Abra o WhatsApp → Aparelhos conectados → Conectar aparelho.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
