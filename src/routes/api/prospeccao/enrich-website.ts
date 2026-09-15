import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateRequest } from "@/lib/supabase-request-auth.server";
import { enrichWebsiteContacts } from "~/modules/prospeccao/services/contact-enrichment";
const bodySchema = z.object({ website: z.string().url().max(2048) });
export const Route = createFileRoute("/api/prospeccao/enrich-website")({ server: { handlers: { POST: async ({ request }) => { const auth = await authenticateRequest(request); if (!auth) return Response.json({ error: "Não autenticado." }, { status: 401 }); try { const { website } = bodySchema.parse(await request.json()); return Response.json({ contacts: await enrichWebsiteContacts(website) }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível enriquecer o prospect." }, { status: 400 }); } } } } });
