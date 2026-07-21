/**
 * Substituição de variáveis `{{token}}` em templates.
 *
 * Recebe o corpo do template e um objeto (tipicamente um Lead) e devolve
 * o texto renderizado + a lista de tokens não substituídos (para alertar
 * o usuário antes de enviar).
 */

import type { Lead } from "@/modules/prospeccao";

import type { MessageTemplateVariableToken } from "../types/message-templates.types";

export type TemplateContext = {
  lead?: Lead;
  responsavelNome?: string;
};

function firstName(full?: string | null): string | undefined {
  if (!full) return undefined;
  const first = full.trim().split(/\s+/)[0];
  return first || undefined;
}

function todayBR(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function buildVariableMap(ctx: TemplateContext): Record<MessageTemplateVariableToken, string | undefined> {
  const lead = ctx.lead;
  return {
    nome_empresa: lead?.nome_empresa,
    primeiro_nome: firstName(lead?.contato_nome),
    contato_nome: lead?.contato_nome ?? undefined,
    contato_cargo: lead?.contato_cargo ?? undefined,
    contato_email: lead?.contato_email ?? undefined,
    telefone: lead?.telefone ?? undefined,
    whatsapp: lead?.whatsapp ?? lead?.telefone ?? undefined,
    cidade: lead?.cidade ?? undefined,
    estado: lead?.estado ?? undefined,
    segmento: lead?.segmento ?? undefined,
    cnpj: lead?.cnpj ?? undefined,
    site: lead?.site ?? undefined,
    instagram: lead?.instagram ?? undefined,
    responsavel: ctx.responsavelNome ?? lead?.responsavel ?? undefined,
    data_hoje: todayBR(),
  };
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function extractTokens(corpo: string): string[] {
  const found = new Set<string>();
  for (const m of corpo.matchAll(TOKEN_RE)) found.add(m[1]);
  return [...found];
}

export type ApplyVariablesResult = {
  text: string;
  missing: string[];
};

export function applyVariables(corpo: string, ctx: TemplateContext): ApplyVariablesResult {
  const map = buildVariableMap(ctx) as Record<string, string | undefined>;
  const missing = new Set<string>();
  const text = corpo.replace(TOKEN_RE, (_full, token: string) => {
    const value = map[token];
    if (value === undefined || value === "") {
      missing.add(token);
      return `{{${token}}}`;
    }
    return value;
  });
  return { text, missing: [...missing] };
}
