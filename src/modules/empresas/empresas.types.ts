export const EMPRESA_TIPOS = ["cliente", "parceiro", "fornecedor", "prospect", "outro"] as const;
export type EmpresaTipo = (typeof EMPRESA_TIPOS)[number];

export const EMPRESA_STATUS = ["ativo", "inativo", "arquivado"] as const;
export type EmpresaStatus = (typeof EMPRESA_STATUS)[number];

export const EMPRESA_ORIGENS = [
  "indicacao",
  "prospeccao",
  "inbound",
  "evento",
  "parceria",
  "outro",
] as const;
export type EmpresaOrigem = (typeof EMPRESA_ORIGENS)[number];

export interface Empresa {
  id: string;
  workspace_id: string;
  // Etapa 1 — obrigatórios
  nome: string;
  tipo: EmpresaTipo;
  status: EmpresaStatus;
  responsavel: string;
  origem: EmpresaOrigem;
  // Etapa 2 — opcionais
  documento?: string;
  site?: string;
  email?: string;
  telefone?: string;
  segmento?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  // Rastreabilidade comercial (Sprint 3.3) — vínculo com origem no funil.
  lead_origem_id?: string;
  data_conversao?: string; // ISO datetime
  // Metadados
  created_at: string;
  updated_at: string;
}

export type EmpresaInput = Omit<Empresa, "id" | "workspace_id" | "created_at" | "updated_at">;

export const EMPRESA_TIPO_LABEL: Record<EmpresaTipo, string> = {
  cliente: "Cliente",
  parceiro: "Parceiro",
  fornecedor: "Fornecedor",
  prospect: "Prospect",
  outro: "Outro",
};

export const EMPRESA_STATUS_LABEL: Record<EmpresaStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  arquivado: "Arquivado",
};

export const EMPRESA_ORIGEM_LABEL: Record<EmpresaOrigem, string> = {
  indicacao: "Indicação",
  prospeccao: "Prospecção",
  inbound: "Inbound",
  evento: "Evento",
  parceria: "Parceria",
  outro: "Outro",
};
