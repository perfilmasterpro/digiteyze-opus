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
  "google_maps",
  "indicacao",
  "inbound",
  "outbound",
  "evento",
  "parceria",
  "redes_sociais",
  "site",
  "anuncio",
  "outro",
] as const;
export type LeadOrigem = (typeof LEAD_ORIGENS)[number];

export const LEAD_ORIGEM_LABEL: Record<LeadOrigem, string> = {
  google_maps: "Google Maps",
  indicacao: "Indicação",
  inbound: "Inbound",
  outbound: "Outbound",
  evento: "Evento",
  parceria: "Parceria",
  redes_sociais: "Redes Sociais",
  site: "Site",
  anuncio: "Anúncio",
  outro: "Outro",
};

export const LEAD_TEMPERATURAS = ["frio", "morno", "quente"] as const;
export type LeadTemperatura = (typeof LEAD_TEMPERATURAS)[number];

export const LEAD_TEMPERATURA_LABEL: Record<LeadTemperatura, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

/**
 * Tokens visuais da temperatura — usados em cards do Kanban e badges.
 * Aponta para o design system (não hardcodar cores em componentes).
 */
export const LEAD_TEMPERATURA_DOT: Record<LeadTemperatura, string> = {
  frio: "bg-info",
  morno: "bg-warning",
  quente: "bg-destructive",
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

/* ─── Sprint 3.3: campos comerciais adicionais ─── */

export const LEAD_CANAIS = [
  "indicacao",
  "outbound",
  "inbound",
  "anuncio",
  "evento",
  "parceiro",
] as const;
export type LeadCanal = (typeof LEAD_CANAIS)[number];

export const LEAD_CANAL_LABEL: Record<LeadCanal, string> = {
  indicacao: "Indicação",
  outbound: "Outbound",
  inbound: "Inbound",
  anuncio: "Anúncio",
  evento: "Evento",
  parceiro: "Parceiro",
};

export const LEAD_PROBABILIDADES = [10, 25, 50, 75, 90] as const;
export type LeadProbabilidade = (typeof LEAD_PROBABILIDADES)[number];

export const LEAD_MOTIVOS_PERDA = [
  "preco",
  "concorrente",
  "sem_interesse",
  "sem_resposta",
  "outro",
] as const;
export type LeadMotivoPerda = (typeof LEAD_MOTIVOS_PERDA)[number];

export const LEAD_MOTIVO_PERDA_LABEL: Record<LeadMotivoPerda, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  sem_interesse: "Sem interesse",
  sem_resposta: "Sem resposta",
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
  // Sprint 3.3
  canal_aquisicao?: LeadCanal;
  probabilidade_fechamento?: LeadProbabilidade;
  motivo_perda?: LeadMotivoPerda;
  // Rastreabilidade de conversão para CRM
  empresa_id?: string;
  data_conversao?: string; // ISO datetime
  // Metadados
  created_at: string;
  updated_at: string;
}

export type LeadInput = Omit<Lead, "id" | "workspace_id" | "created_at" | "updated_at">;
