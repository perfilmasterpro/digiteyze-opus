/**
 * Auth + membership para as rotas de integração (config, QR).
 *
 * Mesmo padrão de `src/routes/api/prospeccao/zapzap-flow.ts`: valida o Bearer
 * do usuário (token do Supabase) e confere que ele é membro do workspace alvo
 * consultando `workspace_members` COM o token do usuário (RLS aplicada). Sem
 * isto, um usuário logado de qualquer workspace poderia ler/gravar config ou
 * gerar QR de outro tenant.
 *
 * Retorna `{ ok: true, userId }` em sucesso, ou `{ ok: false, response }` com a
 * Response pronta (401 sem token / sessão inválida, 403 sem membership, 500
 * config do servidor ausente).
 */

import { createClient } from "@supabase/supabase-js";

const jsonHeaders = { "Content-Type": "application/json" } as const;

function fail(status: number, error: string): { ok: false; response: Response } {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error }), { status, headers: jsonHeaders }),
  };
}

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function authAndWorkspace(
  request: Request,
  workspaceId: unknown,
): Promise<AuthResult> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return fail(401, "Não autenticado.");

  if (typeof workspaceId !== "string" || !workspaceId) {
    return fail(400, "workspace_id é obrigatório.");
  }

  const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return fail(500, "Configuração do servidor indisponível.");
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return fail(401, "Sessão inválida ou expirada.");
  }

  const { data: membership, error: membershipError } = await authClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return fail(403, "Sem acesso a este workspace.");
  }

  return { ok: true, userId: userData.user.id };
}
