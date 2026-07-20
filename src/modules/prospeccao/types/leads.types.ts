export const LEAD_STATUS = [
  "novo_lead",
  "primeiro_contato",
  "whatsapp",
  "respondeu",
  "reuniao",
  "proposta",
  "negociacao",
  "cliente",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo_lead: "Novo Lead",
  primeiro_contato: "Primeiro Contato",
  whatsapp: "WhatsApp",
  respondeu: "Respondeu",
  reuniao: "Reunião",
  proposta: "Proposta",
  negociacao: "Negociação",
  cliente: "Cliente",
  perdido: "Perdido",
};

export const LEAD_ORIGENS = [
  "indicacao",
  "inbound",
  "outbound",
  "evento",
  "parceria",
  "redes_sociais",
  "site",
  "outro",
] as const;
export type LeadOrigem = (typeof LEAD_ORIGENS)[number];

export const LEAD_ORIGEM_LABEL: Record<LeadOrigem, string> = {
  indicacao: "Indicação",
  inbound: "Inbound",
  outbound: "Outbound",
  evento: "Evento",
  parceria: "Parceria",
  redes_sociais: "Redes Sociais",
  site: "Site",
  outro: "Outro",
};

export interface Lead {
  id: string;
  workspace_id: string;
  // Etapa 1 — obrigatórios
  nome_empresa: string;
  status: LeadStatus;
  origem: LeadOrigem;
  responsavel: string;
  // Etapa 2 — opcionais
  cidade?: string;
  estado?: string;
  site?: string;
  instagram?: string;
  telefone?: string;
  whatsapp?: string;
  observacoes?: string;
  proxima_acao?: string;
  data_proxima_acao?: string;
  // Metadados
  created_at: string;
  updated_at: string;
}

export type LeadInput = Omit<Lead, "id" | "workspace_id" | "created_at" | "updated_at">;
