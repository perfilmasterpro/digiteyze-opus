/**
 * Autenticação Supabase para server routes (raw HTTP).
 *
 * Valida o Bearer token da requisição e devolve um client com RLS
 * aplicada como o próprio usuário — o agente nunca ultrapassa
 * as permissões da pessoa autenticada.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type AuthedRequestContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export async function authenticateRequest(
  request: Request,
): Promise<AuthedRequestContext | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Supabase não configurado no servidor.");

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (token.split(".").length !== 3) return null;

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  return { supabase, userId };
}
