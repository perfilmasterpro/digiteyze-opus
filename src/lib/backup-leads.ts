import type { Lead } from "@/modules/prospeccao";

const STORAGE_KEY = "growth-os:leads";
const BACKUP_FILENAME = "backup-growth-os-leads.json";

export type BackupResult =
  | { ok: true; count: number; filename: string }
  | { ok: false; count: 0; error: string };

/**
 * Lê os leads persistidos no localStorage da chave `growth-os:leads`,
 * gera um arquivo JSON e dispara o download no navegador.
 *
 * Retorna o número de leads encontrados ou um erro descritivo.
 */
export function downloadLeadsBackup(): BackupResult {
  if (typeof window === "undefined") {
    return { ok: false, count: 0, error: "Backup só pode ser executado no navegador." };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      ok: false,
      count: 0,
      error: `Nenhum dado encontrado na chave "${STORAGE_KEY}".`,
    };
  }

  let leads: Lead[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        ok: false,
        count: 0,
        error: `O conteúdo da chave "${STORAGE_KEY}" não é uma lista de leads.`,
      };
    }
    leads = parsed as Lead[];
  } catch {
    return {
      ok: false,
      count: 0,
      error: `O conteúdo da chave "${STORAGE_KEY}" não é um JSON válido.`,
    };
  }

  const payload = {
    exported_at: new Date().toISOString(),
    source_key: STORAGE_KEY,
    count: leads.length,
    leads,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = BACKUP_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  return { ok: true, count: leads.length, filename: BACKUP_FILENAME };
}
