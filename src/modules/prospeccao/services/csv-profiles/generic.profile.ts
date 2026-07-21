import type { LeadInput } from "../../types/leads.types";
import { LEAD_ORIGENS, UFS, type LeadOrigem, type UF } from "../../types/leads.types";
import { normalizeHeaderKey, type CsvProfile } from "./types";

/**
 * Profile genérico — mantém compatibilidade com o layout original do
 * Growth OS (nome_empresa, telefone, contato_email, etc.).
 */

const HEADER_ALIASES: Record<string, keyof LeadInput> = {
  nome_empresa: "nome_empresa",
  empresa: "nome_empresa",
  nome: "nome_empresa",
  segmento: "segmento",
  cidade: "cidade",
  estado: "estado",
  uf: "estado",
  site: "site",
  website: "site",
  instagram: "instagram",
  telefone: "telefone",
  whatsapp: "whatsapp",
  email: "contato_email",
  contato_email: "contato_email",
  contato_nome: "contato_nome",
  contato: "contato_nome",
  contato_cargo: "contato_cargo",
  cargo: "contato_cargo",
  origem: "origem",
  responsavel: "responsavel",
  observacoes: "observacoes",
  cnpj: "cnpj",
};

function mapOrigem(v?: string): LeadOrigem | undefined {
  if (!v) return undefined;
  const k = v.trim().toLowerCase().replace(/\s+/g, "_");
  if ((LEAD_ORIGENS as readonly string[]).includes(k)) return k as LeadOrigem;
  if (k.includes("google") || k.includes("maps")) return "google_maps";
  if (k.includes("indic")) return "indicacao";
  if (k.includes("anunc") || k.includes("ads")) return "anuncio";
  if (k.includes("event")) return "evento";
  if (k.includes("parc")) return "parceria";
  if (k.includes("insta") || k.includes("social") || k.includes("rede")) return "redes_sociais";
  if (k.includes("site") || k.includes("form")) return "site";
  if (k.includes("inbound")) return "inbound";
  if (k.includes("outbound")) return "outbound";
  return "outro";
}

function mapUf(v?: string): UF | undefined {
  if (!v) return undefined;
  const u = v.trim().toUpperCase();
  return (UFS as readonly string[]).includes(u) ? (u as UF) : undefined;
}

export const genericProfile: CsvProfile = {
  id: "generic",
  label: "CSV Growth OS (genérico)",
  priority: 0,
  detect() {
    // Fallback: sempre aceita.
    return true;
  },
  mapRow(row, normalizedHeaders) {
    const data: Partial<LeadInput> = {};
    row.forEach((cell, colIdx) => {
      const nh = normalizedHeaders[colIdx];
      if (!nh) return;
      const field = HEADER_ALIASES[nh];
      if (!field) return;
      const value = cell.trim();
      if (!value) return;
      if (field === "origem") {
        data.origem = mapOrigem(value) ?? "outro";
      } else if (field === "estado") {
        data.estado = mapUf(value);
      } else {
        (data as Record<string, unknown>)[field] = value;
      }
    });
    return data;
  },
  defaults: { status: "novo_lead", origem: "outro" },
};

/** Reexport helper para uso do serviço. */
export { normalizeHeaderKey };
