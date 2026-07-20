import {
  createEmpresa,
  publishEmpresaEvent,
  type Empresa,
  type EmpresaInput,
} from "@/modules/empresas";

import { recordLeadEvent } from "./lead-events.service";
import { getLead, updateLead } from "./leads.service";
import type { Lead } from "../types/leads.types";

export type ConvertLeadResult = {
  lead: Lead;
  empresa: Empresa;
};

/**
 * Converte um Lead em Empresa criando rastreabilidade bidirecional:
 *  - Empresa recebe `lead_origem_id` e `data_conversao`.
 *  - Lead recebe `empresa_id`, `data_conversao` e status = "cliente".
 *  - Evento `converted` é registrado no histórico do lead.
 *
 * A assinatura permanece estável para migração ao Supabase (transação SQL).
 */
export async function convertLeadToEmpresa(
  workspaceId: string,
  leadId: string,
): Promise<ConvertLeadResult> {
  const lead = await getLead(workspaceId, leadId);
  if (!lead) throw new Error("Lead não encontrado");
  if (lead.empresa_id) throw new Error("Lead já foi convertido em empresa");

  const nowIso = new Date().toISOString();

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
    lead_origem_id: lead.id,
    data_conversao: nowIso,
  };

  const empresa = await createEmpresa(empresaInput);

  const updatedLead = await updateLead(workspaceId, leadId, {
    ...toLeadInput(lead),
    status: "cliente",
    empresa_id: empresa.id,
    data_conversao: nowIso,
  });

  await recordLeadEvent({
    workspaceId,
    leadId,
    tipo: "converted",
    status_anterior: lead.status,
    status_novo: "cliente",
    descricao: `Convertido em empresa "${empresa.nome}"`,
  });

  // Publica eventos na timeline unificada da empresa:
  //  - empresa.created: primeiro marco na 360°.
  //  - lead.converted: registro cross-módulo (Prospecção → Empresa).
  await publishEmpresaEvent({
    workspaceId,
    empresaId: empresa.id,
    modulo: "empresas",
    tipo: "empresa.created",
    titulo: `Empresa "${empresa.nome}" criada`,
    descricao: "Criada a partir de conversão do funil de prospecção.",
    occurredAt: nowIso,
    payload: { source: "lead_conversion", lead_id: lead.id },
  });
  await publishEmpresaEvent({
    workspaceId,
    empresaId: empresa.id,
    modulo: "prospeccao",
    tipo: "lead.converted",
    titulo: "Lead convertido em cliente",
    descricao: `Lead "${lead.nome_empresa}" convertido em empresa.`,
    occurredAt: nowIso,
    payload: { lead_id: lead.id, status_anterior: lead.status },
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
