import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza números de telefone removendo caracteres não numéricos.
 */
export function normalizePhone(v?: string): string {
  return (v ?? "").replace(/\D+/g, "");
}
