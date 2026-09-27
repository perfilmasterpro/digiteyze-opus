import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, QrCode, CheckCircle2, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspaceId } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const DEFAULT_BASE = "https://api.zapzapapi.com";

type MaskedStatus = {
  configured: boolean;
  source: "workspace" | "env" | null;
  instance_id: string | null;
  base_url: string | null;
  api_key_masked: string | null;
  api_secret_masked: string | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
}

export function ZapZapIntegrationCard() {
  const workspaceId = useCurrentWorkspaceId();

  const [status, setStatus] = useState<MaskedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [instanceId, setInstanceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/integracoes/zapzap-config?workspace_id=${encodeURIComponent(workspaceId)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Falha ao carregar.");
      setStatus(data as MaskedStatus);
      if (data.instance_id) setInstanceId(data.instance_id);
      if (data.base_url) setBaseUrl(data.base_url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar a configuração.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const save = async () => {
    if (!instanceId.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error("Preencha Instance ID, API Key e API Secret.");
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/integracoes/zapzap-config", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspace_id: workspaceId,
          instance_id: instanceId.trim(),
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim(),
          base_url: baseUrl.trim() || DEFAULT_BASE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Falha ao salvar.");
      toast.success("Credenciais do ZapZap salvas.");
      setApiKey("");
      setApiSecret("");
      setStatus(data as MaskedStatus);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const openQr = async () => {
    setQrOpen(true);
    setQrLoading(true);
    setQrImage(null);
    setConnected(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/integracoes/zapzap-qr?workspace_id=${encodeURIComponent(workspaceId)}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Falha ao gerar QR.");
      const isConnected = Boolean(data?.connected) || data?.status === "connected";
      setConnected(isConnected);
      // A UazAPI/ZapZap devolve o QR em campos variados: qrcode / qr / base64 / image.
      const raw = data?.qrcode ?? data?.qr ?? data?.base64 ?? data?.image ?? data?.instance?.qrcode ?? null;
      if (!isConnected && typeof raw === "string" && raw.length > 0) {
        setQrImage(raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar QR.");
      setQrOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">ZapZap — Envio de WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Conecte sua instância do ZapZap para disparar as cadências pelo WhatsApp.
          </p>
        </div>
        {status?.configured ? (
          <Badge variant="secondary" className="shrink-0">
            {status.source === "workspace" ? "Configurado" : "Config. via ambiente"}
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">Não configurado</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          {status?.configured && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div>Instância: <span className="font-mono">{status.instance_id}</span></div>
              <div>API Key: <span className="font-mono">{status.api_key_masked}</span></div>
              <div>Secret: <span className="font-mono">{status.api_secret_masked}</span></div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="zz-inst">Instance ID</Label>
              <Input id="zz-inst" value={instanceId} onChange={(e) => setInstanceId(e.target.value)}
                placeholder="ex: a5893f4d-2e20-…" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zz-key">API Key</Label>
              <Input id="zz-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                placeholder={status?.configured ? "•••• (deixe em branco p/ manter)" : "cole a API Key"} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zz-sec">API Secret</Label>
              <Input id="zz-sec" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
                placeholder={status?.configured ? "•••• (deixe em branco p/ manter)" : "cole o API Secret"} className="font-mono" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="zz-base">Base URL</Label>
              <Input id="zz-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar credenciais
            </Button>
            <Button variant="outline" onClick={openQr} disabled={!status?.configured}>
              <QrCode className="mr-2 h-4 w-4" /> Conectar / Gerar QR
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            As credenciais ficam no seu workspace e são usadas pelo sistema para enviar as mensagens.
            Pra editar, cole novos valores e salve; em branco mantém os atuais.
          </p>
        </>
      )}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>Escaneie o QR com o WhatsApp do número da instância.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-[240px] items-center justify-center">
            {qrLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : connected ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm">WhatsApp já está <strong>conectado</strong>.</p>
              </div>
            ) : qrImage ? (
              <img src={qrImage} alt="QR Code" className="h-56 w-56 rounded bg-white p-2" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <XCircle className="h-8 w-8" />
                <p className="text-sm">Não foi possível obter o QR agora. Tente de novo em instantes.</p>
              </div>
            )}
          </div>
          {!connected && (
            <Button variant="outline" onClick={openQr} disabled={qrLoading}>
              {qrLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Atualizar
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
