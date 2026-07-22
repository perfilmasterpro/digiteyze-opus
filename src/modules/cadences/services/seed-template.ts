/**
 * Seed helper — cria a cadência modelo "Prospecção Prosperar — Hotéis e Pousadas"
 * mapeando categorias existentes por slug e templates por título (best-effort).
 */

import { supabase } from "@/integrations/supabase/client";

import { createCadence } from "./cadences.service";
import type { CadenceStepInput } from "../types/cadences.types";

type SeedStep = {
  nome: string;
  categoriaSlug: string;
  templateTitulo: string;
  tempo_espera_dias: number;
};

const SEED_STEPS: SeedStep[] = [
  { nome: "Primeiro contato", categoriaSlug: "prospeccao", templateTitulo: "Primeiro contato validado", tempo_espera_dias: 0 },
  { nome: "Lead respondeu", categoriaSlug: "qualificacao", templateTitulo: "Apresentação Prosperar", tempo_espera_dias: 1 },
  { nome: "Demonstração", categoriaSlug: "demonstracao", templateTitulo: "Envio de vídeo", tempo_espera_dias: 2 },
  { nome: "Teste gratuito", categoriaSlug: "teste_gratuito", templateTitulo: "Liberação de teste", tempo_espera_dias: 3 },
  { nome: "Proposta/Preço", categoriaSlug: "proposta", templateTitulo: "Envio de planos", tempo_espera_dias: 2 },
  { nome: "Aguardando decisão", categoriaSlug: "follow_up", templateTitulo: "Vou analisar", tempo_espera_dias: 3 },
];

export async function seedProsperarCadence(workspaceId: string, userId: string) {
  const { data: cats } = await supabase
    .from("message_categories")
    .select("id, slug")
    .eq("workspace_id", workspaceId);
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug as string, c.id as string]));

  const { data: templates } = await supabase
    .from("message_templates")
    .select("id, titulo")
    .eq("workspace_id", workspaceId);
  const tplByTitulo = new Map(
    (templates ?? []).map((t) => [(t.titulo as string).toLowerCase(), t.id as string]),
  );

  const steps: CadenceStepInput[] = SEED_STEPS.map((s, i) => ({
    ordem: i + 1,
    nome: s.nome,
    categoria_id: catBySlug.get(s.categoriaSlug) ?? null,
    template_id: tplByTitulo.get(s.templateTitulo.toLowerCase()) ?? null,
    tipo_acao: "mensagem",
    tempo_espera_dias: s.tempo_espera_dias,
    descricao: null,
  }));

  return createCadence(workspaceId, userId, {
    nome: "Prospecção Prosperar — Hotéis e Pousadas",
    descricao: "Sequência comercial modelo para prospecção de hotéis e pousadas.",
    status: "ativa",
    steps,
  });
}
