import { normalizeHeaderKey } from "./types";
import { genericProfile } from "./generic.profile";
import { thunderbitProfile } from "./thunderbit.profile";
/**
 * Registro de profiles disponíveis. Para adicionar novos layouts
 * (Apify, planilhas Excel exportadas, etc.), basta implementar
 * `CsvProfile` e registrá-lo aqui — nenhum código do serviço muda.
 */
export const CSV_PROFILES = [thunderbitProfile, genericProfile];
export function detectCsvProfile(rawHeaders) {
    const normalizedHeaders = rawHeaders.map((h) => {
        const n = normalizeHeaderKey(h);
        return n || null;
    });
    const sorted = [...CSV_PROFILES].sort((a, b) => b.priority - a.priority);
    const profile = sorted.find((p) => p.detect(normalizedHeaders)) ?? genericProfile;
    return { profile, normalizedHeaders };
}
