import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Ações rápidas de contato para prospecção comercial.
 *
 * Mantém o mesmo padrão visual do Prosperar: cada canal exibe
 * o valor + botão de copiar (com feedback "Copiado!") + botão
 * externo quando aplicável.
 */

type Channel = {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  displayValue?: string;
  copyLabel: string;
  openHref?: string;
  openLabel?: string;
};

function normalizePhone(raw: string): string {
  // Mantém apenas dígitos para uso em wa.me/tel:.
  return raw.replace(/\D+/g, "");
}

function instagramUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").trim();
  return `https://instagram.com/${handle}`;
}

function siteUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type Props = {
  telefone?: string;
  whatsapp?: string;
  instagram?: string;
  site?: string;
  googleMapsUrl?: string;
  mapsFallbackQuery?: string;
};

export function QuickContactActions({
  telefone,
  whatsapp,
  instagram,
  site,
  googleMapsUrl,
  mapsFallbackQuery,
}: Props) {
  const channels: Channel[] = [];

  if (telefone) {
    const digits = normalizePhone(telefone);
    channels.push({
      key: "phone",
      label: "Telefone",
      icon: <Phone className="h-4 w-4" />,
      value: telefone,
      copyLabel: "Copiar telefone",
      openHref: digits ? `tel:${digits}` : undefined,
      openLabel: "Ligar",
    });
  }

  if (whatsapp) {
    const digits = normalizePhone(whatsapp);
    channels.push({
      key: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      value: whatsapp,
      copyLabel: "Copiar WhatsApp",
      openHref: digits ? `https://wa.me/${digits}` : undefined,
      openLabel: "Abrir conversa",
    });
  }

  if (instagram) {
    channels.push({
      key: "instagram",
      label: "Instagram",
      icon: <Instagram className="h-4 w-4" />,
      value: instagram.startsWith("http") ? instagram : `@${instagram.replace(/^@/, "")}`,
      copyLabel: "Copiar Instagram",
      openHref: instagramUrl(instagram),
      openLabel: "Abrir Instagram",
    });
  }

  if (site) {
    const url = siteUrl(site);
    channels.push({
      key: "site",
      label: "Site",
      icon: <Globe className="h-4 w-4" />,
      value: url,
      displayValue: url.replace(/^https?:\/\//, "").replace(/^www\./, ""),
      copyLabel: "Copiar site",
      openHref: url,
      openLabel: "Abrir site",
    });
  }

  const mapsHref =
    googleMapsUrl ||
    (mapsFallbackQuery ? mapsSearchUrl(mapsFallbackQuery) : undefined);

  if (mapsHref) {
    channels.push({
      key: "maps",
      label: "Google Maps",
      icon: <MapPin className="h-4 w-4" />,
      value: mapsHref,
      displayValue: googleMapsUrl ? "Localização registrada" : "Buscar no Google Maps",
      copyLabel: "Copiar link",
      openHref: mapsHref,
      openLabel: "Abrir localização",
    });
  }

  if (channels.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Canais de contato</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhum canal de contato cadastrado para este lead.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Canais de contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {channels.map((c) => (
          <ChannelRow key={c.key} channel={c} />
        ))}
      </CardContent>
    </Card>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(channel.value);
      setCopied(true);
      toast.success(`${channel.label} copiado!`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {channel.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {channel.label}
        </p>
        {channel.openHref ? (
          <a
            href={channel.openHref}
            target={channel.openHref.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer noopener"
            className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
            title={channel.value}
          >
            {channel.displayValue ?? channel.value}
          </a>
        ) : (
          <p className="truncate text-sm font-medium text-foreground" title={channel.value}>
            {channel.displayValue ?? channel.value}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          aria-label={channel.copyLabel}
          title={channel.copyLabel}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              <span className="hidden sm:inline">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copiar</span>
            </>
          )}
        </Button>
        {channel.openHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1.5 px-2 text-xs")}
            title={channel.openLabel}
          >
            <a
              href={channel.openHref}
              target={channel.openHref.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer noopener"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Abrir</span>
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
