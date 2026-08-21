/**
 * CSV import service — Prospecção.
 *
 * Sprint 5.3: adiciona rastreabilidade de motivos de descarte, campo/entidade
 * causadora de duplicidade e modo "mesclar duplicados". Layout detectado via
 * `./csv-profiles`.
 */

import { createLead, listLeads, updateLead } from "./leads.service";
import { leadSchema } from "../schemas/leads.schema";
import { type Lead, type LeadInput, type LeadOrigem } from "../types/leads.types";
import { detectCsvProfile, type CsvProfile } from "./csv-profiles";
import { isIgnored } from "./csv-profiles/types";
import { normalizePhone } from "@/lib/utils";


export type ImportRowStatus = "novo" | "duplicado" | "invalido" | "ignorado";
export type DuplicateField = "cnpj" | "dominio" | "telefone";

export interface ImportRow {
  index: number;
  status: ImportRowStatus;
  data: Partial<LeadInput>;
  errors: string[];
  corrections: string[];
  duplicateReason?: string;
  duplicateField?: DuplicateField;
  duplicateLeadId?: string;
  duplicateLeadName?: string;
  ignoredReason?: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  totalAnalisados: number;
  totalNovos: number;
  totalDuplicados: number;
  totalInvalidos: number;
  totalIgnorados: number;
  totalCorrigidos: number;
  profileId: string;
  profileLabel: string;
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

function normalizeSiteUrl(v?: string): { value: string | undefined; corrected: boolean } {
  if (!v) return { value: undefined, corrected: false };
  const trimmed = v.trim();
  if (!trimmed) return { value: undefined, corrected: false };
  if (/^https?:\/\//i.test(trimmed)) return { value: trimmed, corrected: false };
  return { value: `https://${trimmed}`, corrected: true };
}

export function previewCsvImport(
  csvText: string,
  existingLeads: Lead[],
  defaults?: { responsavel?: string },
): ImportPreview {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return {
      rows: [],
      totalAnalisados: 0,
      totalNovos: 0,
      totalDuplicados: 0,
      totalInvalidos: 0,
      totalIgnorados: 0,
      totalCorrigidos: 0,
      profileId: "generic",
      profileLabel: "CSV vazio",
    };
  }

  const rawHeaders = table[0];
  const { profile, normalizedHeaders } = detectCsvProfile(rawHeaders);
  const dataRows = table.slice(1);

  // Indexes: cnpj/domain/phone → lead (id + nome).
  const idxCnpj = new Map<string, Lead>();
  const idxDomain = new Map<string, Lead>();
  const idxPhone = new Map<string, Lead>();
  existingLeads.forEach((l) => {
    const c = normalizeCnpj(l.cnpj);
    if (c) idxCnpj.set(c, l);
    const d = normalizeDomain(l.site);
    if (d) idxDomain.set(d, l);
    const t = normalizePhone(l.telefone);
    if (t) idxPhone.set(t, l);
    const w = normalizePhone(l.whatsapp);
    if (w) idxPhone.set(w, l);
  });

  const seenCnpj = new Map<string, string>(); // cnpj → nome
  const seenDomain = new Map<string, string>();
  const seenPhones = new Map<string, string>();

  const rows: ImportRow[] = [];

  dataRows.forEach((row, i) => {
    const mapped = profile.mapRow(row, normalizedHeaders, rawHeaders);

    if (mapped === null) {
      rows.push({
        index: i + 2,
        status: "ignorado",
        data: {},
        errors: [],
        corrections: [],
        ignoredReason: "Linha descartada pelo layout (sem dados úteis)",
      });
      return;
    }

    if (isIgnored(mapped)) {
      rows.push({
        index: i + 2,
        status: "ignorado",
        data: {},
        errors: [],
        corrections: [],
        ignoredReason: mapped.__ignoredReason,
      });
      return;
    }

    const data: Partial<LeadInput> = {
      ...(profile.defaults ?? {}),
      ...mapped,
    };

    const corrections: string[] = [];

    if (!data.responsavel || String(data.responsavel).trim().length < 2) {
      if (defaults?.responsavel && defaults.responsavel.trim().length >= 2) {
        data.responsavel = defaults.responsavel.trim();
        corrections.push("responsável preenchido automaticamente");
      }
    }

    if (data.site) {
      const { value, corrected } = normalizeSiteUrl(data.site);
      if (value) data.site = value;
      if (corrected) corrections.push("site normalizado (https://)");
    }

    const errors: string[] = [];
    if (!data.nome_empresa || String(data.nome_empresa).trim().length < 2) {
      errors.push("nome_empresa obrigatório");
    }
    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
      parsed.error.errors.forEach((e) => {
        const path = e.path.join(".");
        if (["nome_empresa", "status", "origem"].includes(path)) {
          errors.push(`${path}: ${e.message}`);
        }
      });
    }

    let duplicateReason: string | undefined;
    let duplicateField: DuplicateField | undefined;
    let duplicateLeadId: string | undefined;
    let duplicateLeadName: string | undefined;

    const cnpj = normalizeCnpj(data.cnpj);
    const domain = normalizeDomain(data.site);
    const tel = normalizePhone(data.telefone);
    const wpp = normalizePhone(data.whatsapp);

    if (cnpj && idxCnpj.has(cnpj)) {
      const ex = idxCnpj.get(cnpj)!;
      duplicateField = "cnpj";
      duplicateReason = `Mesmo CNPJ (${data.cnpj})`;
      duplicateLeadId = ex.id;
      duplicateLeadName = ex.nome_empresa;
    } else if (cnpj && seenCnpj.has(cnpj)) {
      duplicateField = "cnpj";
      duplicateReason = `Duplicado no próprio CSV — CNPJ (${data.cnpj})`;
      duplicateLeadName = seenCnpj.get(cnpj);
    } else if (domain && idxDomain.has(domain)) {
      const ex = idxDomain.get(domain)!;
      duplicateField = "dominio";
      duplicateReason = `Mesmo domínio (${domain})`;
      duplicateLeadId = ex.id;
      duplicateLeadName = ex.nome_empresa;
    } else if (domain && seenDomain.has(domain)) {
      duplicateField = "dominio";
      duplicateReason = `Duplicado no próprio CSV — domínio (${domain})`;
      duplicateLeadName = seenDomain.get(domain);
    } else if (tel && idxPhone.has(tel)) {
      const ex = idxPhone.get(tel)!;
      duplicateField = "telefone";
      duplicateReason = `Mesmo telefone (${data.telefone})`;
      duplicateLeadId = ex.id;
      duplicateLeadName = ex.nome_empresa;
    } else if (wpp && idxPhone.has(wpp)) {
      const ex = idxPhone.get(wpp)!;
      duplicateField = "telefone";
      duplicateReason = `Mesmo WhatsApp (${data.whatsapp})`;
      duplicateLeadId = ex.id;
      duplicateLeadName = ex.nome_empresa;
    } else if (tel && seenPhones.has(tel)) {
      duplicateField = "telefone";
      duplicateReason = `Duplicado no próprio CSV — telefone (${data.telefone})`;
      duplicateLeadName = seenPhones.get(tel);
    } else if (wpp && seenPhones.has(wpp)) {
      duplicateField = "telefone";
      duplicateReason = `Duplicado no próprio CSV — WhatsApp (${data.whatsapp})`;
      duplicateLeadName = seenPhones.get(wpp);
    }

    const name = String(data.nome_empresa ?? "");
    if (cnpj) seenCnpj.set(cnpj, name);
    if (domain) seenDomain.set(domain, name);
    if (tel) seenPhones.set(tel, name);
    if (wpp) seenPhones.set(wpp, name);

    const status: ImportRowStatus = errors.length
      ? "invalido"
      : duplicateReason
        ? "duplicado"
        : "novo";

    rows.push({
      index: i + 2,
      status,
      data,
      errors,
      corrections,
      duplicateReason,
      duplicateField,
      duplicateLeadId,
      duplicateLeadName,
    });
  });

  return {
    rows,
    totalAnalisados: dataRows.length,
    totalNovos: rows.filter((r) => r.status === "novo").length,
    totalDuplicados: rows.filter((r) => r.status === "duplicado").length,
    totalInvalidos: rows.filter((r) => r.status === "invalido").length,
    totalIgnorados: rows.filter((r) => r.status === "ignorado").length,
    totalCorrigidos: rows.filter((r) => r.corrections.length > 0).length,
    profileId: profile.id,
    profileLabel: profile.label,
  };
}

function toLeadInput(partial: Partial<LeadInput>): LeadInput {
  return {
    nome_empresa: String(partial.nome_empresa ?? "").trim(),
    status: partial.status ?? "novo_lead",
    origem: (partial.origem as LeadOrigem) ?? "outro",
    responsavel: String(partial.responsavel ?? "").trim(),
    contato_nome: partial.contato_nome,
    contato_cargo: partial.contato_cargo,
    contato_email: partial.contato_email,
    telefone: partial.telefone,
    cnpj: partial.cnpj,
    segmento: partial.segmento,
    cidade: partial.cidade,
    estado: partial.estado,
    site: partial.site,
    instagram: partial.instagram,
    whatsapp: partial.whatsapp,
    observacoes: partial.observacoes,
  };
}

function mergeInto(existing: Lead, incoming: Partial<LeadInput>): LeadInput {
  const pick = <K extends keyof LeadInput>(k: K): LeadInput[K] => {
    const inc = incoming[k];
    if (inc !== undefined && inc !== null && String(inc).trim() !== "") return inc as LeadInput[K];
    return existing[k] as LeadInput[K];
  };
  return {
    nome_empresa: existing.nome_empresa,
    status: existing.status,
    origem: existing.origem,
    responsavel: existing.responsavel,
    contato_nome: pick("contato_nome"),
    contato_cargo: pick("contato_cargo"),
    contato_email: pick("contato_email"),
    telefone: pick("telefone"),
    cnpj: pick("cnpj"),
    segmento: pick("segmento"),
    cidade: pick("cidade"),
    estado: pick("estado"),
    site: pick("site"),
    instagram: pick("instagram"),
    whatsapp: pick("whatsapp"),
    observacoes: pick("observacoes"),
  };
}

export interface CommitOptions {
  mergeDuplicates?: boolean;
}

export async function commitCsvImport(
  workspaceId: string,
  rows: ImportRow[],
  options: CommitOptions = {},
): Promise<{ created: number; merged: number; skipped: number }> {
  let created = 0;
  let merged = 0;
  let skipped = 0;
  for (const r of rows) {
    if (r.status === "novo") {
      await createLead(workspaceId, toLeadInput(r.data));
      created++;
      continue;
    }
    if (
      r.status === "duplicado" &&
      options.mergeDuplicates &&
      r.duplicateLeadId
    ) {
      const existing = (await listLeads(workspaceId)).find(
        (l) => l.id === r.duplicateLeadId,
      );
      if (existing) {
        await updateLead(workspaceId, existing.id, mergeInto(existing, r.data));
        merged++;
        continue;
      }
    }
    skipped++;
  }
  return { created, merged, skipped };
}

/** Helper — recarrega leads existentes para dedupe. */
export async function loadExistingLeads(workspaceId: string): Promise<Lead[]> {
  return listLeads(workspaceId);
}

export type { CsvProfile };
