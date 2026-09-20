import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateRequest } from "@/lib/supabase-request-auth.server";
import { lookupReceitaCnpj } from "@/modules/prospeccao/services/open-data.service";

const bodySchema = z.object({
  cnpj: z.string().trim().min(14).max(20),
});

export const Route = createFileRoute("/api/prospeccao/receita-cnpj")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return Response.json({ error: "Não autenticado." }, { status: 401 });

        try {
          const body = bodySchema.parse(await request.json());
          const company = await lookupReceitaCnpj(body.cnpj);
          return Response.json({ company });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro ao consultar a Receita Federal.";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
