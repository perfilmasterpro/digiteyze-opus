/**
 * Tipos do domínio "Biblioteca de Mensagens Comerciais".
 *
 * A categoria agora é uma string livre — a lista real de categorias vive na
 * tabela `message_categories` (gerenciada em Configurações). Os valores abaixo
 * permanecem como fallback para labels legadas.
 */

export const MESSAGE_TEMPLATE_CATEGORIAS = [
  "prospeccao",
  "qualificacao",
  "demonstracao",
  "teste_gratuito",
  "proposta",
  "follow_up",
  "reengajamento",
  "perdido",
  "apresentacao",
  "objecao",
  "agradecimento",
  "outro",
] as const;
export type MessageTemplateCategoria = string;

export const MESSAGE_TEMPLATE_CATEGORIA_LABEL: Record<string, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  demonstracao: "Demonstração",
  teste_gratuito: "Teste Gratuito",
  proposta: "Proposta/Preço",
  follow_up: "Follow-up",
  reengajamento: "Reengajamento",
  perdido: "Perdido",
  apresentacao: "Apresentação",
  objecao: "Objeção",
  agradecimento: "Agradecimento",
  outro: "Outro",
};

/** Retorna um label amigável para qualquer slug, mesmo custom. */
export function formatCategoriaLabel(slug: string): string {
  return (
    MESSAGE_TEMPLATE_CATEGORIA_LABEL[slug] ??
    slug
      .split("_")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(" ")
  );
}

export interface MessageTemplate {
  id: string;
  workspace_id: string;
  titulo: string;
  categoria: MessageTemplateCategoria;
  corpo: string;
  variaveis: string[];
  ativo: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageTemplateInput = {
  titulo: string;
  categoria: MessageTemplateCategoria;
  corpo: string;
  ativo?: boolean;
};

/**
 * Variáveis disponíveis para substituição a partir do Lead atual.
 */
export const MESSAGE_TEMPLATE_VARIABLES = [
  { token: "nome_empresa", label: "Nome da empresa" },
  { token: "primeiro_nome", label: "Primeiro nome do contato" },
  { token: "contato_nome", label: "Nome completo do contato" },
  { token: "contato_cargo", label: "Cargo do contato" },
  { token: "contato_email", label: "E-mail do contato" },
  { token: "telefone", label: "Telefone" },
  { token: "whatsapp", label: "WhatsApp" },
  { token: "cidade", label: "Cidade" },
  { token: "estado", label: "Estado (UF)" },
  { token: "segmento", label: "Segmento" },
  { token: "cnpj", label: "CNPJ" },
  { token: "site", label: "Site" },
  { token: "instagram", label: "Instagram" },
  { token: "responsavel", label: "Responsável (vendedor)" },
  { token: "data_hoje", label: "Data de hoje (dd/mm/aaaa)" },
] as const;

export type MessageTemplateVariableToken =
  (typeof MESSAGE_TEMPLATE_VARIABLES)[number]["token"];
