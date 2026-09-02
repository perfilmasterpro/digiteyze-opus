/**
 * Provider do Lovable AI Gateway (server-only).
 *
 * Modelos `openai/*` são servidos pela Responses API do gateway.
 * A chave nunca sai do servidor.
 */

import { createOpenAI } from "@ai-sdk/openai";

export const AGENT_MODEL = "openai/gpt-5.6-sol";

export function createLovableGateway(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}
