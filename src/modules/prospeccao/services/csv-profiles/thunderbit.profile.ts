import type { LeadInput, UF } from "../../types/leads.types";
import { UFS } from "../../types/leads.types";
import type { CsvProfile } from "./types";

/**
 * Profile Thunderbit / Google Maps.
 *
 * Detecta cabeçalhos típicos exportados pela extensão Thunderbit
 * (Title, Phone number, Website, Address, Google Map URL, …) e mapeia
 * automaticamente para `LeadInput`.
 *
 *  - Instagram detectado pelo domínio da Website.
 *  - Endereço parseado em bairro/cidade/estado quando possível.
 *  - Linhas "Patrocinado / Sponsored / Anúncio" são descartadas silenciosamente.
 *  - origem sempre = "google_maps".
 */

const AD_MARKERS = ["patrocinado", "sponsored", "anúncio", "anuncio"];

const THIRD_PARTY_SITE_HOSTS = [
  "booking.com",
  "expedia.com",
  "tripadvisor.com",
  "tripadvisor.com.br",
  "hoteis.com",
  "hotels.com",
  "airbnb.com",
  "decolar.com",
  "trivago.com",
  "trivago.com.br",
];

function isThirdPartyListing(url: string): boolean {
  const lower = url.toLowerCase();
  return THIRD_PARTY_SITE_HOSTS.some((h) => lower.includes(h));
}

const HEADER_ALIASES: Record<string, keyof LeadInput | "extra_endereco" | "extra_google_maps_url" | "extra_avaliacao" | "extra_qtd_avaliacoes" | "extra_preco" | "extra_status"> = {
  title: "nome_empresa",
  name: "nome_empresa",
  business_name: "nome_empresa",
  type: "segmento",
  category: "segmento",
  phone_number: "telefone",
  phone: "telefone",
  telefone: "telefone",
  website: "site",
  site: "site",
  address: "extra_endereco",
  endereco: "extra_endereco",
  google_map_url: "extra_google_maps_url",
  google_maps_url: "extra_google_maps_url",
  maps_url: "extra_google_maps_url",
  review_rating: "extra_avaliacao",
  rating: "extra_avaliacao",
  of_reviews: "extra_qtd_avaliacoes",
  reviews: "extra_qtd_avaliacoes",
  reviews_count: "extra_qtd_avaliacoes",
  pricing: "extra_preco",
  price: "extra_preco",
  status: "extra_status",
};

function isInstagramUrl(url: string): boolean {
  return /(?:^|\/\/)([\w.-]*\.)?instagram\.com\b/i.test(url);
}

/**
 * Parse endereço típico do Google Maps.
 * Ex.: "Av. Beira Mar, s/n - Iriri, Anchieta - ES, 29230-000, Brasil"
 * → { endereco, bairro, cidade, estado }
 */
export function parseGoogleMapsAddress(address: string): {
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: UF;
} {
  const clean = address.replace(/,\s*Brasil\s*$/i, "").trim();
  // Split first by " - " (rua - bairro, cidade - UF, CEP)
  const dashParts = clean.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);

  let endereco: string | undefined;
  let bairro: string | undefined;
  let cidade: string | undefined;
  let estado: UF | undefined;

  if (dashParts.length >= 3) {
    // [rua, "bairro, cidade", "UF, CEP"]
    endereco = dashParts[0];
    const mid = dashParts[1].split(",").map((s) => s.trim());
    if (mid.length >= 2) {
      bairro = mid[0];
      cidade = mid.slice(1).join(", ");
    } else {
      cidade = mid[0];
    }
    const ufMatch = dashParts[2].match(/\b([A-Z]{2})\b/);
    if (ufMatch && (UFS as readonly string[]).includes(ufMatch[1])) {
      estado = ufMatch[1] as UF;
    }
  } else if (dashParts.length === 2) {
    // ["rua, bairro, cidade", "UF"]  ou  ["rua", "cidade - UF"]
    endereco = dashParts[0];
    const tail = dashParts[1];
    const ufMatch = tail.match(/\b([A-Z]{2})\b/);
    if (ufMatch && (UFS as readonly string[]).includes(ufMatch[1])) {
      estado = ufMatch[1] as UF;
      const rest = tail.replace(ufMatch[0], "").replace(/[,\s]+$/, "").trim();
      if (rest) cidade = rest.replace(/^[,\s]+/, "");
    } else {
      cidade = tail;
    }
    // rua pode conter "rua, bairro, cidade"
    const parts = endereco.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2 && !cidade) {
      endereco = parts.slice(0, -1).join(", ");
      cidade = parts[parts.length - 1];
    } else if (parts.length >= 3) {
      endereco = parts.slice(0, -2).join(", ");
      bairro = parts[parts.length - 2];
    }
  } else {
    endereco = clean;
  }

  return { endereco, bairro, cidade, estado };
}

export const thunderbitProfile: CsvProfile = {
  id: "thunderbit_google_maps",
  label: "Thunderbit — Google Maps",
  priority: 10,
  detect(normalizedHeaders) {
    const set = new Set(normalizedHeaders.filter(Boolean) as string[]);
    // Assinatura mínima: título + (endereço ou google maps url).
    const hasTitle = set.has("title");
    const hasMapsSignal =
      set.has("google_map_url") ||
      set.has("google_maps_url") ||
      set.has("maps_url") ||
      set.has("address");
    return hasTitle && hasMapsSignal;
  },
  mapRow(row, normalizedHeaders) {
    const data: Partial<LeadInput> = {};
    const extras: {
      endereco?: string;
      google_maps_url?: string;
      avaliacao?: string;
      qtd_avaliacoes?: string;
      preco?: string;
      status?: string;
    } = {};

    row.forEach((cell, colIdx) => {
      const nh = normalizedHeaders[colIdx];
      if (!nh) return;
      const field = HEADER_ALIASES[nh];
      if (!field) return;
      const value = cell.trim();
      if (!value) return;

      switch (field) {
        case "extra_endereco":
          extras.endereco = value;
          break;
        case "extra_google_maps_url":
          extras.google_maps_url = value;
          break;
        case "extra_avaliacao":
          extras.avaliacao = value;
          break;
        case "extra_qtd_avaliacoes":
          extras.qtd_avaliacoes = value;
          break;
        case "extra_preco":
          extras.preco = value;
          break;
        case "extra_status":
          extras.status = value;
          break;
        case "site":
          if (isInstagramUrl(value)) {
            data.instagram = value;
          } else {
            data.site = value;
          }
          break;
        case "telefone":
          data.telefone = value;
          // Heurística: telefone brasileiro que começa com 9 no local → WhatsApp.
          if (/\b9\d{4}[\s-]?\d{4}\b/.test(value)) {
            data.whatsapp = value;
          }
          break;
        default:
          (data as Record<string, unknown>)[field] = value;
      }
    });

    // Filtro de anúncios — retorna razão para rastreabilidade.
    const title = (data.nome_empresa ?? "").toString();
    const statusExtra = (extras.status ?? "").toString();
    const combined = `${title} ${statusExtra}`.toLowerCase();
    const adMatch = AD_MARKERS.find((m) => combined.includes(m));
    if (adMatch) {
      return { __ignoredReason: `Anúncio patrocinado (marcador: "${adMatch}")` };
    }
    if (!title.trim()) {
      return { __ignoredReason: "Linha sem nome de empresa (título vazio)" };
    }

    // Parse endereço.
    if (extras.endereco) {
      const parsed = parseGoogleMapsAddress(extras.endereco);
      if (parsed.cidade && !data.cidade) data.cidade = parsed.cidade;
      if (parsed.estado && !data.estado) data.estado = parsed.estado;
    }

    // Consolida extras em observações — mantém rastreabilidade sem exigir
    // novas colunas no schema `Lead`.
    const notes: string[] = [];
    if (extras.endereco) notes.push(`Endereço: ${extras.endereco}`);
    const parsedBairro = extras.endereco
      ? parseGoogleMapsAddress(extras.endereco).bairro
      : undefined;
    if (parsedBairro) notes.push(`Bairro: ${parsedBairro}`);
    if (extras.avaliacao) notes.push(`Avaliação Google: ${extras.avaliacao}`);
    if (extras.qtd_avaliacoes)
      notes.push(`Nº avaliações: ${extras.qtd_avaliacoes}`);
    if (extras.preco) notes.push(`Faixa de preço: ${extras.preco}`);
    if (extras.status) notes.push(`Status Google: ${extras.status}`);
    if (extras.google_maps_url)
      notes.push(`Google Maps: ${extras.google_maps_url}`);
    if (notes.length) {
      data.observacoes = notes.join("\n");
    }

    return data;
  },
  defaults: { status: "novo_lead", origem: "google_maps" },
};
