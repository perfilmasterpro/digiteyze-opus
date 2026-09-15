export type ProspectQualification = {
  score: number;
  label: "Alta prioridade" | "Boa oportunidade" | "Dados limitados";
  reasons: string[];
};

type QualificationInput = {
  website?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  rating?: number;
  userRatingCount?: number;
};

/**
 * Measures prospecting readiness/contactability, not purchase likelihood or business quality.
 * The weights are intentionally simple and transparent so the badge is an operational aid,
 * not a prediction presented as a fact.
 */
export function qualifyProspect(input: QualificationInput): ProspectQualification {
  let score = 0;
  const reasons: string[] = [];

  if (input.whatsapp) {
    score += 35;
    reasons.push("WhatsApp público");
  }
  if (input.instagram) {
    score += 20;
    reasons.push("Instagram público");
  }
  if (input.website) {
    score += 15;
    reasons.push("site");
  }
  if (input.phone) {
    score += 15;
    reasons.push("telefone");
  }
  if (typeof input.userRatingCount === "number") {
    if (input.userRatingCount >= 100) score += 10;
    else if (input.userRatingCount >= 25) score += 5;
    if (input.userRatingCount >= 25) reasons.push("presença relevante no Google");
  }
  if (typeof input.rating === "number" && input.rating >= 4) {
    score += 5;
    reasons.push("boa avaliação no Google");
  }

  const boundedScore = Math.min(100, score);
  const label = boundedScore >= 65 ? "Alta prioridade" : boundedScore >= 35 ? "Boa oportunidade" : "Dados limitados";

  return { score: boundedScore, label, reasons };
}
