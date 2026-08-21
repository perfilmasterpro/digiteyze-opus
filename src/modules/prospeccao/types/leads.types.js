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
];
export const LEAD_STATUS_LABEL = {
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
];
export const LEAD_ORIGEM_LABEL = {
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
export const LEAD_TEMPERATURAS = ["frio", "morno", "quente"];
export const LEAD_TEMPERATURA_LABEL = {
    frio: "Frio",
    morno: "Morno",
    quente: "Quente",
};
/**
 * Tokens visuais da temperatura — usados em cards do Kanban e badges.
 * Aponta para o design system (não hardcodar cores em componentes).
 */
export const LEAD_TEMPERATURA_DOT = {
    frio: "bg-info",
    morno: "bg-warning",
    quente: "bg-destructive",
};
export const LEAD_TEMPERATURA_EMOJI = {
    frio: "❄️",
    morno: "🌡️",
    quente: "🔥",
};
/**
 * Cor por estágio do pipeline (referencia tokens em src/styles.css).
 * Usada para: barra superior da coluna, indicador do card e badge de status.
 */
export const LEAD_STATUS_COLOR_VAR = {
    novo_lead: "--stage-novo",
    primeiro_contato: "--stage-primeiro",
    whatsapp: "--stage-whatsapp",
    respondeu: "--stage-respondeu",
    reuniao: "--stage-reuniao",
    proposta: "--stage-proposta",
    negociacao: "--stage-negociacao",
    cliente: "--stage-cliente",
    perdido: "--stage-perdido",
};
export const LEAD_PORTES = ["mei", "micro", "pequeno", "medio", "grande"];
export const LEAD_PORTE_LABEL = {
    mei: "MEI",
    micro: "Microempresa",
    pequeno: "Pequeno porte",
    medio: "Médio porte",
    grande: "Grande porte",
};
export const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];
/* ─── Sprint 3.3: campos comerciais adicionais ─── */
export const LEAD_CANAIS = [
    "indicacao",
    "outbound",
    "inbound",
    "anuncio",
    "evento",
    "parceiro",
];
export const LEAD_CANAL_LABEL = {
    indicacao: "Indicação",
    outbound: "Outbound",
    inbound: "Inbound",
    anuncio: "Anúncio",
    evento: "Evento",
    parceiro: "Parceiro",
};
export const LEAD_PROBABILIDADES = [10, 25, 50, 75, 90];
export const LEAD_MOTIVOS_PERDA = [
    "preco",
    "concorrente",
    "sem_interesse",
    "sem_resposta",
    "outro",
];
export const LEAD_MOTIVO_PERDA_LABEL = {
    preco: "Preço",
    concorrente: "Concorrente",
    sem_interesse: "Sem interesse",
    sem_resposta: "Sem resposta",
    outro: "Outro",
};
