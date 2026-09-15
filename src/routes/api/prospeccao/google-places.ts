import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateRequest } from "@/lib/supabase-request-auth.server";
import { searchGooglePlaces } from "~/modules/prospeccao/services/google-places.service";

const bodySchema = z.object({
  textQuery: z.string().trim().min(2).max(200),
  pageSize: z.number().int().min(1).max(20).optional(),
});

export const Route = createFileRoute("/api/prospeccao/google-places")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return Response.json({ error: "Não autenticado." }, { status: 401 });

        try {
          const body = bodySchema.parse(await request.json());
          const places = await searchGooglePlaces(body);
          return Response.json({ places });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao consultar o Google Places.";
          const status = message.includes("não configurada") ? 503 : 400;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
