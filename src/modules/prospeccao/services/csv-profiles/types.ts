import type { LeadInput } from "../../types/leads.types";

/**
 * CSV Profile — abstração para mapear diferentes layouts de CSV
 * (Thunderbit, Google Maps, Apify, genérico Growth OS, etc.) para o
 * shape interno `LeadInput`.
 *
 * Cada profile:
 *  1. `detect(headers)` — indica se este layout é compatível com o cabeçalho.
 *  2. `mapRow(row, headerMap)` — converte uma linha em `Partial<LeadInput>`
 *     ou retorna `null` para descartar silenciosamente (ex.: anúncios).
 *  3. `defaults` — valores padrão aplicados a todas as linhas (ex.: origem).
 */
export interface CsvProfile {
  id: string;
  label: string;
  /** Prioridade — o mais alto vence quando múltiplos detectam. */
  priority: number;
  detect(normalizedHeaders: (string | null)[]): boolean;
  mapRow(
    row: string[],
    normalizedHeaders: (string | null)[],
    rawHeaders: string[],
  ): Partial<LeadInput> | null;
  defaults?: Partial<LeadInput>;
}

export function normalizeHeaderKey(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
