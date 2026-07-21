/**
 * CSV import service — Prospecção.
 *
 * Parses CSV text, validates required fields, deduplicates against existing
 * leads (por CNPJ, domínio do site, telefone/WhatsApp) e permite preview
 * antes da commit. Multi-tenant: recebe workspaceId explícito.
 */

import { createLead, listLeads } from "./leads.service";
import { leadSchema } from "../schemas/leads.schema";
import {
  LEAD_ORIGENS,
  UFS,
  type Lead,
  type LeadInput,
  type LeadOrigem,
  type UF,
} from "../types/leads.types";

export type ImportRowStatus = "novo" | "duplicado" | "invalido";

export interface ImportRow {
  index: number;
  status: ImportRowStatus;
  data: Partial<LeadInput>;
  errors: string[];
  duplicateReason?: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  totalNovos: number;
  totalDuplicados: number;
  totalInvalidos: number;
}

/** Parser CSV minimalista com suporte a aspas duplas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim() !== "");
}

function normalizePhone(v?: string): string {
  return (v ?? "").replace(/\D+/g, "");
}

function normalizeDomain(url?: string): string {
  if (!url) return "";
  try {
    const u = url.match(/^https?:\/\//) ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
  }
}

function normalizeCnpj(v?: string): string {
  return (v ?? "").replace(/\D+/g, "");
}

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
  responsável: "responsavel",
  observacoes: "observacoes",
  observações: "observacoes",
  cnpj: "cnpj",
};

function normalizeHeader(h: string): keyof LeadInput | null {
  const k = h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  return (HEADER_ALIASES[k] as keyof LeadInput | undefined) ?? null;
}

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

export function previewCsvImport(
  csvText: string,
  existingLeads: Lead[],
  defaults?: { responsavel?: string },
): ImportPreview {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { rows: [], totalNovos: 0, totalDuplicados: 0, totalInvalidos: 0 };
  }
  const headers = table[0].map((h) => normalizeHeader(h));
  const dataRows = table.slice(1);

  const existingCnpj = new Set(
    existingLeads.map((l) => normalizeCnpj(l.cnpj)).filter(Boolean),
  );
  const existingDomain = new Set(
    existingLeads.map((l) => normalizeDomain(l.site)).filter(Boolean),
  );
  const existingPhones = new Set<string>();
  existingLeads.forEach((l) => {
    const t = normalizePhone(l.telefone);
    const w = normalizePhone(l.whatsapp);
    if (t) existingPhones.add(t);
    if (w) existingPhones.add(w);
  });

  const seenCnpj = new Set<string>();
  const seenDomain = new Set<string>();
  const seenPhones = new Set<string>();

  const rows: ImportRow[] = dataRows.map((row, i) => {
    const data: Partial<LeadInput> = {
      status: "novo_lead",
      origem: "outro",
      responsavel: defaults?.responsavel ?? "",
    };
    row.forEach((cell, colIdx) => {
      const field = headers[colIdx];
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

    const errors: string[] = [];
    if (!data.nome_empresa || String(data.nome_empresa).trim().length < 2) {
      errors.push("nome_empresa obrigatório");
    }
    if (!data.responsavel || String(data.responsavel).trim().length < 2) {
      errors.push("responsavel obrigatório");
    }
    // valida via schema (retorna avisos, não bloqueia salvo obrigatórios)
    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
      parsed.error.errors.forEach((e) => {
        const path = e.path.join(".");
        if (["nome_empresa", "responsavel", "status", "origem"].includes(path)) {
          errors.push(`${path}: ${e.message}`);
        }
      });
    }

    // duplicados
    let duplicateReason: string | undefined;
    const cnpj = normalizeCnpj(data.cnpj);
    const domain = normalizeDomain(data.site);
    const tel = normalizePhone(data.telefone);
    const wpp = normalizePhone(data.whatsapp);
    if (cnpj && (existingCnpj.has(cnpj) || seenCnpj.has(cnpj))) {
      duplicateReason = `CNPJ ${data.cnpj}`;
    } else if (domain && (existingDomain.has(domain) || seenDomain.has(domain))) {
      duplicateReason = `Domínio ${domain}`;
    } else if (
      (tel && (existingPhones.has(tel) || seenPhones.has(tel))) ||
      (wpp && (existingPhones.has(wpp) || seenPhones.has(wpp)))
    ) {
      duplicateReason = `Telefone ${data.telefone ?? data.whatsapp}`;
    }
    if (cnpj) seenCnpj.add(cnpj);
    if (domain) seenDomain.add(domain);
    if (tel) seenPhones.add(tel);
    if (wpp) seenPhones.add(wpp);

    const status: ImportRowStatus = errors.length
      ? "invalido"
      : duplicateReason
        ? "duplicado"
        : "novo";

    return { index: i + 2, status, data, errors, duplicateReason };
  });

  return {
    rows,
    totalNovos: rows.filter((r) => r.status === "novo").length,
    totalDuplicados: rows.filter((r) => r.status === "duplicado").length,
    totalInvalidos: rows.filter((r) => r.status === "invalido").length,
  };
}

export async function commitCsvImport(
  workspaceId: string,
  rows: ImportRow[],
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const r of rows) {
    if (r.status !== "novo") {
      skipped++;
      continue;
    }
    const input: LeadInput = {
      nome_empresa: String(r.data.nome_empresa ?? "").trim(),
      status: r.data.status ?? "novo_lead",
      origem: (r.data.origem as LeadOrigem) ?? "outro",
      responsavel: String(r.data.responsavel ?? "").trim(),
      contato_nome: r.data.contato_nome,
      contato_cargo: r.data.contato_cargo,
      contato_email: r.data.contato_email,
      telefone: r.data.telefone,
      cnpj: r.data.cnpj,
      segmento: r.data.segmento,
      cidade: r.data.cidade,
      estado: r.data.estado,
      site: r.data.site,
      instagram: r.data.instagram,
      whatsapp: r.data.whatsapp,
      observacoes: r.data.observacoes,
    };
    await createLead(workspaceId, input);
    created++;
  }
  return { created, skipped };
}

/** Helper — recarrega leads existentes para dedupe. */
export async function loadExistingLeads(workspaceId: string): Promise<Lead[]> {
  return listLeads(workspaceId);
}
