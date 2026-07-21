/**
 * Tipos do domínio "Biblioteca de Mensagens Comerciais".
 *
 * Refletem o schema Supabase (`message_templates`, `message_template_favorites`)
 * mais os labels/enums usados na UI.
 */

export const MESSAGE_TEMPLATE_CATEGORIAS = [
  "prospeccao",
  "follow_up",
  "apresentacao",
  "objecao",
  "reengajamento",
  "agradecimento",
  "outro",
] as const;
export type MessageTemplateCategoria = (typeof MESSAGE_TEMPLATE_CATEGORIAS)[number];

export const MESSAGE_TEMPLATE_CATEGORIA_LABEL: Record<MessageTemplateCategoria, string> = {
  prospeccao: "Prospecção",
  follow_up: "Follow-up",
  apresentacao: "Apresentação",
  objecao: "Objeção",
  reengajamento: "Reengajamento",
  agradecimento: "Agradecimento",
  outro: "Outro",
};

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
 * Mantido em um único lugar para que o Picker e o form usem a mesma lista.
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
