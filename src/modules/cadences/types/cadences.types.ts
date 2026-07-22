/**
 * Tipos do módulo Cadências Comerciais.
 * Persistência: Supabase (tabelas `cadences`, `cadence_steps`, `lead_cadences`).
 */

import type { Database } from "@/integrations/supabase/types";

export type CadenceRow = Database["public"]["Tables"]["cadences"]["Row"];
export type CadenceStepRow = Database["public"]["Tables"]["cadence_steps"]["Row"];
export type LeadCadenceRow = Database["public"]["Tables"]["lead_cadences"]["Row"];

export const CADENCE_STATUS = ["ativa", "inativa"] as const;
export type CadenceStatus = (typeof CADENCE_STATUS)[number];
export const CADENCE_STATUS_LABEL: Record<CadenceStatus, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
};

export const CADENCE_STEP_TIPOS = ["mensagem", "tarefa", "espera"] as const;
export type CadenceStepTipo = (typeof CADENCE_STEP_TIPOS)[number];
export const CADENCE_STEP_TIPO_LABEL: Record<CadenceStepTipo, string> = {
  mensagem: "Mensagem",
  tarefa: "Tarefa",
  espera: "Espera",
};

export const LEAD_CADENCE_STATUS = ["ativa", "concluida", "pausada"] as const;
export type LeadCadenceStatus = (typeof LEAD_CADENCE_STATUS)[number];
export const LEAD_CADENCE_STATUS_LABEL: Record<LeadCadenceStatus, string> = {
  ativa: "Ativa",
  concluida: "Concluída",
  pausada: "Pausada",
};

export type Cadence = CadenceRow;
export type CadenceStep = CadenceStepRow;
export type LeadCadence = LeadCadenceRow;

export type CadenceStepInput = {
  id?: string;
  ordem: number;
  nome: string;
  categoria_id?: string | null;
  template_id?: string | null;
  tipo_acao: CadenceStepTipo;
  tempo_espera_dias: number;
  descricao?: string | null;
};

export type CadenceInput = {
  nome: string;
  descricao?: string | null;
  status: CadenceStatus;
  steps: CadenceStepInput[];
};

export type CadenceWithSteps = Cadence & { steps: CadenceStep[] };
