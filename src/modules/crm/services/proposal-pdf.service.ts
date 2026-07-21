/**
 * Gerador de PDF de Propostas Comerciais.
 *
 * Serviço isolado — não persiste dados, não acessa storage.
 * Recebe a Proposal completa (com itens) e, opcionalmente, dados do
 * cliente (Empresa) e do emissor. Retorna um Blob pronto para download
 * ou visualização (URL.createObjectURL).
 *
 * A biblioteca `jspdf` é um detalhe interno: os consumidores usam apenas
 * `generateProposalPdf()` / `generateProposalPdfDataUrl()`. Uma futura
 * troca de engine (server-side, react-pdf, etc.) não altera a API pública.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Empresa } from "@/modules/empresas";

import {
  PROPOSAL_STATUS_LABEL,
  type Proposal,
} from "../types/proposals.types";

export interface ProposalPdfIssuer {
  nome: string;
  documento?: string;
  email?: string;
  telefone?: string;
  site?: string;
  endereco?: string;
}

export interface ProposalPdfClient {
  nome: string;
  contato?: string;
  email?: string;
  telefone?: string;
  documento?: string;
  cidade?: string;
  estado?: string;
}

export interface ProposalPdfInput {
  proposal: Proposal;
  client?: ProposalPdfClient;
  issuer?: ProposalPdfIssuer;
  condicoesComerciais?: string;
}

/** Emissor padrão — pode ser sobrescrito quando existir "workspace settings". */
const DEFAULT_ISSUER: ProposalPdfIssuer = {
  nome: "Digiteyze — Growth OS",
  email: "contato@digiteyze.com",
  site: "digiteyze.com",
};

const DEFAULT_CONDICOES =
  "Valores em Reais (BRL). Impostos e taxas conforme legislação vigente. Prazos e escopo sujeitos a alinhamento formal antes do início da execução.";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Deriva um número humano de proposta a partir do id + data. */
export function buildProposalNumber(p: Proposal): string {
  const d = new Date(p.created_at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const short = p.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `PROP-${y}${m}-${short}`;
}

/** Converte uma Empresa em ProposalPdfClient (helper). */
export function empresaToClient(empresa: Empresa): ProposalPdfClient {
  return {
    nome: empresa.nome,
    contato: empresa.responsavel,
    email: empresa.email,
    telefone: empresa.telefone,
    documento: empresa.documento,
    cidade: empresa.cidade,
    estado: empresa.estado,
  };
}

function drawHeader(
  doc: jsPDF,
  issuer: ProposalPdfIssuer,
  proposal: Proposal,
  numero: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Faixa superior
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(issuer.nome, 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const linha = [issuer.email, issuer.telefone, issuer.site]
    .filter(Boolean)
    .join("  ·  ");
  if (linha) doc.text(linha, 14, 18);
  if (issuer.documento) doc.text(issuer.documento, 14, 23);

  // Bloco de identificação da proposta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PROPOSTA COMERCIAL", pageWidth - 14, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nº ${numero}`, pageWidth - 14, 18, { align: "right" });
  doc.text(
    `Emitida em ${fmtDate(proposal.created_at)}`,
    pageWidth - 14,
    23,
    { align: "right" },
  );

  doc.setTextColor(15, 23, 42);
}

function drawClient(doc: jsPDF, client: ProposalPdfClient | undefined, y: number) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const linhas = client
    ? [
        client.nome,
        client.contato ? `Contato: ${client.contato}` : null,
        client.email ? `E-mail: ${client.email}` : null,
        client.telefone ? `Telefone: ${client.telefone}` : null,
        client.documento ? `Documento: ${client.documento}` : null,
        [client.cidade, client.estado].filter(Boolean).join(" / ") || null,
      ].filter(Boolean) as string[]
    : ["—"];
  linhas.forEach((l, i) => doc.text(l, 14, y + 6 + i * 5));
  return y + 6 + linhas.length * 5;
}

function drawProposal(doc: jsPDF, proposal: Proposal, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(proposal.titulo, 14, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Status: ${PROPOSAL_STATUS_LABEL[proposal.status]}  ·  Validade: ${proposal.validade_dias} dias`,
    14,
    y + 10,
  );
  doc.setTextColor(15, 23, 42);
  return y + 14;
}

/**
 * Gera o PDF e retorna um Blob. Não realiza download.
 */
export async function generateProposalPdf(input: ProposalPdfInput): Promise<Blob> {
  const issuer = { ...DEFAULT_ISSUER, ...(input.issuer ?? {}) };
  const numero = buildProposalNumber(input.proposal);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawHeader(doc, issuer, input.proposal, numero);
  const afterClient = drawClient(doc, input.client, 40);
  const afterTitle = drawProposal(doc, input.proposal, afterClient + 4);

  // Tabela de itens
  autoTable(doc, {
    startY: afterTitle + 2,
    head: [["Descrição", "Qtd.", "Unitário", "Total"]],
    body: input.proposal.items.map((i) => [
      i.descricao,
      String(i.quantidade),
      currency.format(i.valor_unitario),
      currency.format(i.total),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: {
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (
    doc as unknown as { lastAutoTable?: { finalY: number } }
  ).lastAutoTable?.finalY ?? afterTitle + 20;

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `Total: ${currency.format(input.proposal.valor_total)}`,
    doc.internal.pageSize.getWidth() - 14,
    finalY + 10,
    { align: "right" },
  );

  // Observações
  let cursor = finalY + 20;
  if (input.proposal.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Observações", 14, cursor);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const obs = doc.splitTextToSize(
      input.proposal.observacoes,
      doc.internal.pageSize.getWidth() - 28,
    );
    doc.text(obs, 14, cursor + 6);
    cursor += 6 + obs.length * 5;
  }

  // Rodapé — condições
  const pageHeight = doc.internal.pageSize.getHeight();
  const rodapeY = Math.max(cursor + 8, pageHeight - 30);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, rodapeY - 4, doc.internal.pageSize.getWidth() - 14, rodapeY - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Condições comerciais", 14, rodapeY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const cond = doc.splitTextToSize(
    input.condicoesComerciais ?? DEFAULT_CONDICOES,
    doc.internal.pageSize.getWidth() - 28,
  );
  doc.text(cond, 14, rodapeY + 5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Validade da proposta: ${input.proposal.validade_dias} dias a partir de ${fmtDate(
      input.proposal.created_at,
    )}`,
    14,
    pageHeight - 8,
  );
  doc.text(numero, doc.internal.pageSize.getWidth() - 14, pageHeight - 8, {
    align: "right",
  });

  return doc.output("blob");
}

/** Gera o PDF e retorna uma object URL — usar para preview em nova aba. */
export async function generateProposalPdfObjectUrl(
  input: ProposalPdfInput,
): Promise<string> {
  const blob = await generateProposalPdf(input);
  return URL.createObjectURL(blob);
}

/** Sugere um nome de arquivo padronizado. */
export function buildProposalPdfFilename(p: Proposal): string {
  const slug = p.titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return `${buildProposalNumber(p)}${slug ? `-${slug}` : ""}.pdf`;
}
