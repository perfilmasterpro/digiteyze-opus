import { z } from "zod";

/**
 * Busca gratuita de empresas por segmento e cidade usando bases públicas abertas
 * (OpenStreetMap/Overpass para descoberta geográfica) e dados cadastrais oficiais
 * da Receita Federal via BrasilAPI (consulta por CNPJ).
 *
 * Nenhuma chave de API é necessária — todas as fontes são públicas e gratuitas.
 */

const USER_AGENT = "GrowthOS/1.0 (prospeccao; contato@digiteyze.com.br)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const BRASILAPI_CNPJ = "https://brasilapi.com.br/api/cnpj/v1";

/* ───────────────────────── Segmentos → filtros OSM ───────────────────────── */

type SegmentRule = { keywords: string[]; filters: string[]; label: string };

const SEGMENT_RULES: SegmentRule[] = [
  { label: "Hotel e Pousada", keywords: ["hotel", "pousada", "hospedagem", "resort", "hostel", "motel"], filters: ['["tourism"~"^(hotel|guest_house|hostel|motel|apartment|resort)$"]'] },
  { label: "Restaurante e Alimentação", keywords: ["restaurante", "comida", "alimenta", "lanchonete", "pizzaria", "bar", "cafe", "café", "padaria", "sorveteria"], filters: ['["amenity"~"^(restaurant|fast_food|cafe|bar|pub|ice_cream|food_court)$"]', '["shop"~"^(bakery|butcher|confectionery|deli)$"]'] },
  { label: "Clínica e Saúde", keywords: ["clinica", "clínica", "saude", "saúde", "medic", "dentista", "odonto", "fisioterap", "laborat", "veterin"], filters: ['["amenity"~"^(clinic|doctors|dentist|hospital|veterinary|pharmacy)$"]', '["healthcare"]'] },
  { label: "Beleza e Estética", keywords: ["salao", "salão", "beleza", "estetica", "estética", "barbearia", "cabelo", "manicure", "spa"], filters: ['["shop"~"^(hairdresser|beauty|massage|cosmetics)$"]', '["leisure"="spa"]'] },
  { label: "Academia e Fitness", keywords: ["academia", "fitness", "crossfit", "pilates", "muscula"], filters: ['["leisure"~"^(fitness_centre|sports_centre)$"]', '["sport"="fitness"]'] },
  { label: "Automotivo", keywords: ["oficina", "auto", "carro", "mecanic", "mecânic", "pneu", "lava", "concession"], filters: ['["shop"~"^(car_repair|car|car_parts|tyres|motorcycle)$"]', '["amenity"="car_wash"]'] },
  { label: "Construção e Materiais", keywords: ["construc", "construç", "material", "ferragem", "marmor", "vidra", "madeira"], filters: ['["shop"~"^(doityourself|hardware|trade|paint|glaziery|building_materials)$"]', '["craft"~"^(carpenter|electrician|plumber|painter)$"]'] },
  { label: "Imobiliário", keywords: ["imobili", "imovel", "imóvel", "corretor"], filters: ['["office"="estate_agent"]', '["shop"="estate_agent"]'] },
  { label: "Escritório e Serviços", keywords: ["contab", "advoga", "escritorio", "escritório", "consultor", "arquitet", "engenh", "seguro", "marketing", "agencia", "agência"], filters: ['["office"]'] },
  { label: "Comércio e Varejo", keywords: ["loja", "comercio", "comércio", "varejo", "mercado", "supermercado", "roupa", "moda", "calcado", "calçado", "petshop", "pet shop", "farmacia", "farmácia", "otica", "ótica", "joalher", "papelaria", "movei", "móvei"], filters: ['["shop"]'] },
  { label: "Educação", keywords: ["escola", "curso", "educac", "educaç", "faculdade", "creche", "idioma"], filters: ['["amenity"~"^(school|college|university|kindergarten|language_school|driving_school)$"]'] },
  { label: "Turismo e Lazer", keywords: ["turismo", "passeio", "agencia de viagem", "lazer", "evento", "buffet"], filters: ['["shop"="travel_agency"]', '["office"="travel_agent"]', '["amenity"~"^(events_venue|nightclub)$"]'] },
];

function resolveSegment(segment: string) {
  const normalized = segment
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const rule of SEGMENT_RULES) {
    const hit = rule.keywords.some((keyword) =>
      normalized.includes(keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "")),
    );
    if (hit) return rule;
  }
  // fallback amplo: qualquer estabelecimento comercial com nome
  return { label: segment, keywords: [], filters: ['["shop"]', '["office"]', '["amenity"~"^(restaurant|cafe|clinic|doctors)$"]'] } satisfies SegmentRule;
}

export const SEGMENT_SUGGESTIONS = SEGMENT_RULES.map((rule) => rule.label);

/* ───────────────────────────── Tipos públicos ───────────────────────────── */

export type OpenPlaceProspect = {
  sourceId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  cnpj?: string;
  mapUrl?: string;
  category?: string;
  segmentLabel: string;
};

export type SearchOpenPlacesInput = {
  segment: string;
  city: string;
  uf: string;
  limit?: number;
};

export type SearchOpenPlacesResult = {
  places: OpenPlaceProspect[];
  resolvedCity: string;
};

export type ReceitaCompany = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao?: string;
  dataAbertura?: string;
  porte?: string;
  cnaePrincipal?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
};

/* ─────────────────────────── Descoberta geográfica ─────────────────────────── */

const nominatimSchema = z.array(
  z.object({
    osm_id: z.number(),
    osm_type: z.string(),
    name: z.string().optional(),
    display_name: z.string().optional(),
  }),
);

async function resolveCityArea(city: string, uf: string) {
  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("country", "Brazil");
  url.searchParams.set("city", city);
  url.searchParams.set("state", uf);

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!response.ok) throw new Error("Não foi possível localizar a cidade na base pública.");

  const parsed = nominatimSchema.safeParse(await response.json());
  const match = parsed.success ? parsed.data[0] : undefined;
  if (!match || match.osm_type !== "relation") {
    throw new Error(`Cidade "${city} - ${uf}" não encontrada na base pública. Confira a grafia.`);
  }

  return { areaId: 3600000000 + match.osm_id, name: match.name ?? city };
}

const overpassSchema = z.object({
  elements: z
    .array(
      z.object({
        type: z.string(),
        id: z.number(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        center: z.object({ lat: z.number(), lon: z.number() }).optional(),
        tags: z.record(z.string(), z.string()).optional(),
      }),
    )
    .default([]),
});

function buildAddress(tags: Record<string, string>) {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
  const parts = [street, tags["addr:suburb"] ?? tags["addr:neighbourhood"], tags["addr:city"], tags["addr:state"]].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

function categoryOf(tags: Record<string, string>) {
  return tags.amenity ?? tags.shop ?? tags.tourism ?? tags.office ?? tags.leisure ?? tags.craft ?? tags.healthcare;
}

function digitsOnly(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

export async function searchOpenPlaces(input: SearchOpenPlacesInput): Promise<SearchOpenPlacesResult> {
  const city = input.city.trim();
  const uf = input.uf.trim().toUpperCase();
  const segment = input.segment.trim();
  if (!city) throw new Error("Informe a cidade.");
  if (!segment) throw new Error("Informe o segmento.");

  const rule = resolveSegment(segment);
  const area = await resolveCityArea(city, uf);
  const limit = Math.min(Math.max(input.limit ?? 120, 10), 200);

  const body = rule.filters
    .flatMap((filter) => [`node${filter}(area.a);`, `way${filter}(area.a);`])
    .join("");
  const query = `[out:json][timeout:60];area(${area.areaId})->.a;(${body});out center tags ${limit};`;

  const response = await fetch(OVERPASS, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  });

  if (!response.ok) {
    throw new Error("A base pública de estabelecimentos está ocupada no momento. Tente novamente em instantes.");
  }

  const parsed = overpassSchema.parse(await response.json());
  const seen = new Set<string>();
  const places: OpenPlaceProspect[] = [];

  for (const element of parsed.elements) {
    const tags = element.tags ?? {};
    const name = tags.name ?? tags["brand"] ?? tags["operator"];
    if (!name) continue;

    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;

    places.push({
      sourceId: `${element.type}/${element.id}`,
      name,
      address: buildAddress(tags),
      city: tags["addr:city"] ?? area.name,
      state: (tags["addr:state"] ?? uf).toUpperCase().slice(0, 2),
      phone: tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"],
      website: tags.website ?? tags["contact:website"],
      cnpj: digitsOnly(tags["ref:vatin"]).slice(-14) || undefined,
      mapUrl: lat && lon ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}` : undefined,
      category: categoryOf(tags),
      segmentLabel: rule.label,
    });
  }

  return { places, resolvedCity: area.name };
}

/* ─────────────────────── Receita Federal (BrasilAPI) ─────────────────────── */

const receitaSchema = z.object({
  cnpj: z.string(),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().nullable().optional(),
  descricao_situacao_cadastral: z.string().nullable().optional(),
  data_inicio_atividade: z.string().nullable().optional(),
  porte: z.string().nullable().optional(),
  cnae_fiscal_descricao: z.string().nullable().optional(),
  ddd_telefone_1: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  logradouro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  municipio: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
});

export async function lookupReceitaCnpj(rawCnpj: string): Promise<ReceitaCompany> {
  const cnpj = digitsOnly(rawCnpj);
  if (cnpj.length !== 14) throw new Error("Informe um CNPJ válido com 14 dígitos.");

  const response = await fetch(`${BRASILAPI_CNPJ}/${cnpj}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (response.status === 404) throw new Error("CNPJ não encontrado na base da Receita Federal.");
  if (!response.ok) throw new Error("A consulta à Receita Federal está indisponível no momento.");

  const data = receitaSchema.parse(await response.json());
  const endereco = [data.logradouro, data.numero, data.bairro].filter(Boolean).join(", ");

  return {
    cnpj: data.cnpj,
    razaoSocial: data.razao_social ?? "",
    nomeFantasia: data.nome_fantasia ?? undefined,
    situacao: data.descricao_situacao_cadastral ?? undefined,
    dataAbertura: data.data_inicio_atividade ?? undefined,
    porte: data.porte ?? undefined,
    cnaePrincipal: data.cnae_fiscal_descricao ?? undefined,
    telefone: data.ddd_telefone_1?.trim() || undefined,
    email: data.email ?? undefined,
    endereco: endereco || undefined,
    cidade: data.municipio ?? undefined,
    uf: data.uf ?? undefined,
    cep: data.cep ?? undefined,
  };
}
