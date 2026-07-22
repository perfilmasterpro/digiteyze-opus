/**
 * Categorias da Biblioteca de Mensagens, geridas por workspace.
 *
 * As cores definidas aqui são compartilhadas entre a Biblioteca de Mensagens,
 * o Kanban de Leads e as Cadências comerciais — consuma via
 * `useMessageCategoryMap()` / `useMessageCategoryColor(slug)`.
 */

export interface MessageCategory {
  id: string;
  workspace_id: string;
  slug: string;
  nome: string;
  cor: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export type MessageCategoryInput = {
  slug: string;
  nome: string;
  cor: string;
  ativo?: boolean;
  ordem?: number;
};

/** Cor neutra usada como fallback quando o slug não existe (ainda) na tabela. */
export const DEFAULT_CATEGORY_COLOR = "#64748b";

/**
 * Semente das 8 categorias padrão. Mantida no client apenas como fallback
 * para leituras antes do primeiro fetch — a fonte da verdade é o Supabase.
 */
export const DEFAULT_MESSAGE_CATEGORIES: ReadonlyArray<
  Omit<MessageCategoryInput, "ativo"> & { ativo: boolean }
> = [
  { slug: "prospeccao", nome: "Prospecção", cor: "#3b82f6", ordem: 1, ativo: true },
  { slug: "qualificacao", nome: "Qualificação", cor: "#22c55e", ordem: 2, ativo: true },
  { slug: "demonstracao", nome: "Demonstração", cor: "#8b5cf6", ordem: 3, ativo: true },
  { slug: "teste_gratuito", nome: "Teste Gratuito", cor: "#15803d", ordem: 4, ativo: true },
  { slug: "proposta", nome: "Proposta/Preço", cor: "#f97316", ordem: 5, ativo: true },
  { slug: "follow_up", nome: "Follow-up", cor: "#eab308", ordem: 6, ativo: true },
  { slug: "reengajamento", nome: "Reengajamento", cor: "#c084fc", ordem: 7, ativo: true },
  { slug: "perdido", nome: "Perdido", cor: "#ef4444", ordem: 8, ativo: true },
];

/** Normaliza um texto arbitrário em um slug seguro. */
export function toCategorySlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
