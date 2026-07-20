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

export const LEAD_TEMPERATURAS = ["frio", "morno", "quente"] as const;
export type LeadTemperatura = (typeof LEAD_TEMPERATURAS)[number];

export const LEAD_TEMPERATURA_LABEL: Record<LeadTemperatura, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

export const LEAD_PORTES = ["mei", "micro", "pequeno", "medio", "grande"] as const;
export type LeadPorte = (typeof LEAD_PORTES)[number];

export const LEAD_PORTE_LABEL: Record<LeadPorte, string> = {
  mei: "MEI",
  micro: "Microempresa",
  pequeno: "Pequeno porte",
  medio: "Médio porte",
  grande: "Grande porte",
};

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
export type UF = (typeof UFS)[number];

export interface Lead {
  id: string;
  workspace_id: string;
  // Etapa 1 — obrigatórios
  nome_empresa: string;
  status: LeadStatus;
  origem: LeadOrigem;
  responsavel: string;
  // Contato principal (Etapa 1 estendida)
  contato_nome?: string;
  contato_cargo?: string;
  contato_email?: string;
  telefone?: string;
  // Etapa 2 — opcionais / B2B
  cnpj?: string;
  segmento?: string;
  porte?: LeadPorte;
  temperatura?: LeadTemperatura;
  valor_potencial?: number;
  cidade?: string;
  estado?: UF;
  site?: string;
  instagram?: string;
  whatsapp?: string;
  observacoes?: string;
  proxima_acao?: string;
  data_proxima_acao?: string; // ISO date (yyyy-MM-dd)
  // Rastreabilidade de conversão para CRM
  empresa_id?: string;
  // Metadados
  created_at: string;
  updated_at: string;
}

export type LeadInput = Omit<Lead, "id" | "workspace_id" | "created_at" | "updated_at">;
