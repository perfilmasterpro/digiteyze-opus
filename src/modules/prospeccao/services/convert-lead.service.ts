import { createEmpresa, type Empresa, type EmpresaInput } from "@/modules/empresas";

import { recordLeadEvent } from "./lead-events.service";
import { getLead, updateLead } from "./leads.service";
import type { Lead } from "../types/leads.types";

export type ConvertLeadResult = {
  lead: Lead;
  empresa: Empresa;
};

/**
 * Converte um Lead em Empresa.
 *
 * Fluxo:
 *  1. Carrega o lead do workspace atual.
 *  2. Cria Empresa via API pública do módulo Empresas (nunca importa internals).
 *  3. Atualiza o lead: status = "cliente" + empresa_id = empresa criada.
 *  4. Registra evento `converted` no histórico.
 *
 * Idempotência: se o lead já possui `empresa_id`, lança erro para evitar duplicação.
 * A assinatura é estável para futura migração ao Supabase (transação SQL).
 */
export async function convertLeadToEmpresa(
  workspaceId: string,
  leadId: string,
): Promise<ConvertLeadResult> {
  const lead = await getLead(workspaceId, leadId);
  if (!lead) throw new Error("Lead não encontrado");
  if (lead.empresa_id) throw new Error("Lead já foi convertido em empresa");

  const empresaInput: EmpresaInput = {
    nome: lead.nome_empresa,
    tipo: "cliente",
    status: "ativo",
    responsavel: lead.responsavel,
    origem: mapOrigem(lead.origem),
    documento: lead.cnpj,
    site: lead.site,
    email: lead.contato_email,
    telefone: lead.telefone ?? lead.whatsapp,
    segmento: lead.segmento,
    cidade: lead.cidade,
    estado: lead.estado,
    observacoes: lead.observacoes,
  };

  const empresa = await createEmpresa(empresaInput);

  const updatedLead = await updateLead(workspaceId, leadId, {
    ...toLeadInput(lead),
    status: "cliente",
    empresa_id: empresa.id,
  });

  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "converted",
    status_anterior: lead.status,
    status_novo: "cliente",
    descricao: `Convertido em empresa "${empresa.nome}"`,
  });

  return { lead: updatedLead, empresa };
}

function toLeadInput(l: Lead) {
  const {
    id: _id,
    workspace_id: _ws,
    created_at: _c,
    updated_at: _u,
    ...rest
  } = l;
  void _id;
  void _ws;
  void _c;
  void _u;
  return rest;
}

function mapOrigem(o: Lead["origem"]) {
  // Origens de Lead não têm 1:1 com origens de Empresa; mapa conservador.
  const map: Record<Lead["origem"], EmpresaInput["origem"]> = {
    indicacao: "indicacao",
    inbound: "inbound",
    outbound: "prospeccao",
    evento: "evento",
    parceria: "parceria",
    redes_sociais: "outro",
    site: "inbound",
    outro: "outro",
  };
  return map[o];
}
