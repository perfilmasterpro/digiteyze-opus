/**
 * CSV import service — Prospecção.
 *
 * Sprint 5.3: adiciona rastreabilidade de motivos de descarte, campo/entidade
 * causadora de duplicidade e modo "mesclar duplicados". Layout detectado via
 * `./csv-profiles`.
 */
import { createLead, listLeads, updateLead } from "./leads.service";
import { leadSchema } from "../schemas/leads.schema";
import { detectCsvProfile } from "./csv-profiles";
import { isIgnored } from "./csv-profiles/types";
import { normalizePhone } from "@/lib/utils";
/** Parser CSV minimalista com suporte a aspas duplas. */
function parseCsv(text) {
    const rows = [];
    let cur = [];
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
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                field += c;
            }
        }
        else {
            if (c === '"')
                inQuotes = true;
            else if (c === ",") {
                cur.push(field);
                field = "";
            }
            else if (c === "\n") {
                cur.push(field);
                rows.push(cur);
                cur = [];
                field = "";
            }
            else {
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
function normalizeDomain(url) {
    if (!url)
        return "";
    try {
        const u = url.match(/^https?:\/\//) ? url : `https://${url}`;
        return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
    }
    catch {
        return url.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase();
    }
}
function normalizeCnpj(v) {
    return (v ?? "").replace(/\D+/g, "");
}
function normalizeSiteUrl(v) {
    if (!v)
        return { value: undefined, corrected: false };
    const trimmed = v.trim();
    if (!trimmed)
        return { value: undefined, corrected: false };
    if (/^https?:\/\//i.test(trimmed))
        return { value: trimmed, corrected: false };
    return { value: `https://${trimmed}`, corrected: true };
}
export function previewCsvImport(csvText, existingLeads, defaults) {
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
    const idxCnpj = new Map();
    const idxDomain = new Map();
    const idxPhone = new Map();
    existingLeads.forEach((l) => {
        const c = normalizeCnpj(l.cnpj);
        if (c)
            idxCnpj.set(c, l);
        const d = normalizeDomain(l.site);
        if (d)
            idxDomain.set(d, l);
        const t = normalizePhone(l.telefone);
        if (t)
            idxPhone.set(t, l);
        const w = normalizePhone(l.whatsapp);
        if (w)
            idxPhone.set(w, l);
    });
    const seenCnpj = new Map(); // cnpj → nome
    const seenDomain = new Map();
    const seenPhones = new Map();
    const rows = [];
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
        const data = {
            ...(profile.defaults ?? {}),
            ...mapped,
        };
        const corrections = [];
        if (!data.responsavel || String(data.responsavel).trim().length < 2) {
            if (defaults?.responsavel && defaults.responsavel.trim().length >= 2) {
                data.responsavel = defaults.responsavel.trim();
                corrections.push("responsável preenchido automaticamente");
            }
        }
        if (data.site) {
            const { value, corrected } = normalizeSiteUrl(data.site);
            if (value)
                data.site = value;
            if (corrected)
                corrections.push("site normalizado (https://)");
        }
        const errors = [];
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
        let duplicateReason;
        let duplicateField;
        let duplicateLeadId;
        let duplicateLeadName;
        const cnpj = normalizeCnpj(data.cnpj);
        const domain = normalizeDomain(data.site);
        const tel = normalizePhone(data.telefone);
        const wpp = normalizePhone(data.whatsapp);
        if (cnpj && idxCnpj.has(cnpj)) {
            const ex = idxCnpj.get(cnpj);
            duplicateField = "cnpj";
            duplicateReason = `Mesmo CNPJ (${data.cnpj})`;
            duplicateLeadId = ex.id;
            duplicateLeadName = ex.nome_empresa;
        }
        else if (cnpj && seenCnpj.has(cnpj)) {
            duplicateField = "cnpj";
            duplicateReason = `Duplicado no próprio CSV — CNPJ (${data.cnpj})`;
            duplicateLeadName = seenCnpj.get(cnpj);
        }
        else if (domain && idxDomain.has(domain)) {
            const ex = idxDomain.get(domain);
            duplicateField = "dominio";
            duplicateReason = `Mesmo domínio (${domain})`;
            duplicateLeadId = ex.id;
            duplicateLeadName = ex.nome_empresa;
        }
        else if (domain && seenDomain.has(domain)) {
            duplicateField = "dominio";
            duplicateReason = `Duplicado no próprio CSV — domínio (${domain})`;
            duplicateLeadName = seenDomain.get(domain);
        }
        else if (tel && idxPhone.has(tel)) {
            const ex = idxPhone.get(tel);
            duplicateField = "telefone";
            duplicateReason = `Mesmo telefone (${data.telefone})`;
            duplicateLeadId = ex.id;
            duplicateLeadName = ex.nome_empresa;
        }
        else if (wpp && idxPhone.has(wpp)) {
            const ex = idxPhone.get(wpp);
            duplicateField = "telefone";
            duplicateReason = `Mesmo WhatsApp (${data.whatsapp})`;
            duplicateLeadId = ex.id;
            duplicateLeadName = ex.nome_empresa;
        }
        else if (tel && seenPhones.has(tel)) {
            duplicateField = "telefone";
            duplicateReason = `Duplicado no próprio CSV — telefone (${data.telefone})`;
            duplicateLeadName = seenPhones.get(tel);
        }
        else if (wpp && seenPhones.has(wpp)) {
            duplicateField = "telefone";
            duplicateReason = `Duplicado no próprio CSV — WhatsApp (${data.whatsapp})`;
            duplicateLeadName = seenPhones.get(wpp);
        }
        const name = String(data.nome_empresa ?? "");
        if (cnpj)
            seenCnpj.set(cnpj, name);
        if (domain)
            seenDomain.set(domain, name);
        if (tel)
            seenPhones.set(tel, name);
        if (wpp)
            seenPhones.set(wpp, name);
        const status = errors.length
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
function toLeadInput(partial) {
    return {
        nome_empresa: String(partial.nome_empresa ?? "").trim(),
        status: partial.status ?? "novo_lead",
        origem: partial.origem ?? "outro",
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
function mergeInto(existing, incoming) {
    const pick = (k) => {
        const inc = incoming[k];
        if (inc !== undefined && inc !== null && String(inc).trim() !== "")
            return inc;
        return existing[k];
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
export async function commitCsvImport(workspaceId, rows, options = {}) {
    let created = 0;
    let merged = 0;
    let skipped = 0;
    for (const r of rows) {
        if (r.status === "novo") {
            await createLead(workspaceId, toLeadInput(r.data));
            created++;
            continue;
        }
        if (r.status === "duplicado" &&
            options.mergeDuplicates &&
            r.duplicateLeadId) {
            const existing = (await listLeads(workspaceId)).find((l) => l.id === r.duplicateLeadId);
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
export async function loadExistingLeads(workspaceId) {
    return listLeads(workspaceId);
}
