import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateRequest } from "@/lib/supabase-request-auth.server";
import { searchOpenPlaces } from "@/modules/prospeccao/services/open-data.service";

const bodySchema = z.object({
  segment: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  uf: z.string().trim().length(2),
  limit: z.number().int().min(10).max(200).optional(),
});

export const Route = createFileRoute("/api/prospeccao/open-places")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return Response.json({ error: "Não autenticado." }, { status: 401 });

        try {
          const body = bodySchema.parse(await request.json());
          const result = await searchOpenPlaces(body);
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao consultar a base pública.";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
