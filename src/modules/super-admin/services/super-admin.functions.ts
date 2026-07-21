import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertSuperAdmin(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super admin only");
}

export type SuperAdminStats = {
  workspaces: number;
  users: number;
  empresas: number;
  leads: number;
  opportunities: number;
  proposals: number;
  contracts: number;
  signatures: number;
};

export const getSuperAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperAdminStats> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables = [
      "workspaces",
      "profiles",
      "empresas",
      "leads",
      "opportunities",
      "proposals",
      "contracts",
      "signatures",
    ] as const;

    const results = await Promise.all(
      tables.map((t) =>
        supabaseAdmin.from(t).select("id", { count: "exact", head: true }),
      ),
    );

    return {
      workspaces: results[0].count ?? 0,
      users: results[1].count ?? 0,
      empresas: results[2].count ?? 0,
      leads: results[3].count ?? 0,
      opportunities: results[4].count ?? 0,
      proposals: results[5].count ?? 0,
      contracts: results[6].count ?? 0,
      signatures: results[7].count ?? 0,
    };
  });

export type SuperAdminWorkspace = {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
  plan: string;
  status: string;
  owner_email: string | null;
  owner_name: string | null;
};

export const listSuperAdminWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperAdminWorkspace[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ws, members, settings, admins, profiles] = await Promise.all([
      supabaseAdmin.from("workspaces").select("id,name,created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("workspace_members").select("workspace_id,user_id"),
      supabaseAdmin.from("workspace_settings").select("workspace_id,plan,status"),
      supabaseAdmin.from("user_roles").select("workspace_id,user_id,role").eq("role", "administrador"),
      supabaseAdmin.from("profiles").select("id,email,display_name"),
    ]);

    if (ws.error) throw new Error(ws.error.message);

    const countByWs = new Map<string, number>();
    (members.data ?? []).forEach((m) => {
      countByWs.set(m.workspace_id, (countByWs.get(m.workspace_id) ?? 0) + 1);
    });

    const settingsByWs = new Map<string, { plan: string; status: string }>();
    (settings.data ?? []).forEach((s) => {
      settingsByWs.set(s.workspace_id, { plan: s.plan, status: s.status });
    });

    const profileById = new Map<string, { email: string | null; display_name: string | null }>();
    (profiles.data ?? []).forEach((p) => {
      profileById.set(p.id, { email: p.email, display_name: p.display_name });
    });

    const ownerByWs = new Map<string, string>();
    (admins.data ?? []).forEach((a) => {
      if (!ownerByWs.has(a.workspace_id)) ownerByWs.set(a.workspace_id, a.user_id);
    });

    return (ws.data ?? []).map((w) => {
      const owner = ownerByWs.get(w.id);
      const ownerProfile = owner ? profileById.get(owner) : undefined;
      const s = settingsByWs.get(w.id);
      return {
        id: w.id,
        name: w.name,
        created_at: w.created_at,
        member_count: countByWs.get(w.id) ?? 0,
        plan: s?.plan ?? "free",
        status: s?.status ?? "active",
        owner_email: ownerProfile?.email ?? null,
        owner_name: ownerProfile?.display_name ?? null,
      };
    });
  });

export const updateWorkspaceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        plan: z.string().min(1).max(40).optional(),
        status: z.enum(["active", "blocked", "inactive"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = {};
    if (data.plan !== undefined) patch.plan = data.plan;
    if (data.status !== undefined) patch.status = data.status;

    const { error } = await supabaseAdmin
      .from("workspace_settings")
      .upsert({ workspace_id: data.workspaceId, ...patch }, { onConflict: "workspace_id" });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_logs").insert({
      event_type: "workspace.settings_updated",
      severity: "info",
      actor_id: context.userId,
      workspace_id: data.workspaceId,
      message: `Configurações do workspace atualizadas`,
      metadata: patch as never,
    });

    return { ok: true };
  });

export type SuperAdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
  role: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  is_super_admin: boolean;
};

export const listSuperAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperAdminUser[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [authRes, profiles, memberships, workspaces, roles, admins] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("profiles").select("id,email,display_name,created_at"),
      supabaseAdmin.from("workspace_members").select("user_id,workspace_id"),
      supabaseAdmin.from("workspaces").select("id,name"),
      supabaseAdmin.from("user_roles").select("user_id,workspace_id,role"),
      supabaseAdmin.from("super_admins").select("user_id"),
    ]);

    if (authRes.error) throw new Error(authRes.error.message);

    const wsById = new Map((workspaces.data ?? []).map((w) => [w.id, w.name]));
    const roleByUserWs = new Map<string, string>();
    (roles.data ?? []).forEach((r) =>
      roleByUserWs.set(`${r.user_id}:${r.workspace_id}`, r.role as string),
    );
    const wsByUser = new Map<string, string>();
    (memberships.data ?? []).forEach((m) => {
      if (!wsByUser.has(m.user_id)) wsByUser.set(m.user_id, m.workspace_id);
    });
    const profileById = new Map(
      (profiles.data ?? []).map((p) => [p.id, p] as const),
    );
    const superSet = new Set((admins.data ?? []).map((a) => a.user_id));

    return authRes.data.users.map((u) => {
      const wsId = wsByUser.get(u.id) ?? null;
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? null,
        display_name: profile?.display_name ?? null,
        workspace_id: wsId,
        workspace_name: wsId ? wsById.get(wsId) ?? null : null,
        role: wsId ? roleByUserWs.get(`${u.id}:${wsId}`) ?? null : null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
        is_super_admin: superSet.has(u.id),
      };
    });
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        role: z.enum([
          "administrador",
          "gestor",
          "operacional",
          "financeiro",
          "marketing",
          "comercial",
          "desenvolvimento",
          "suporte",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("workspace_id", data.workspaceId);
    if (delErr) throw new Error(delErr.message);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, workspace_id: data.workspaceId, role: data.role });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_logs").insert({
      event_type: "user.role_changed",
      severity: "info",
      actor_id: context.userId,
      workspace_id: data.workspaceId,
      message: `Papel do usuário alterado para ${data.role}`,
      metadata: { user_id: data.userId, role: data.role },
    });

    return { ok: true };
  });

export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.blocked ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_logs").insert({
      event_type: data.blocked ? "user.blocked" : "user.unblocked",
      severity: data.blocked ? "warning" : "info",
      actor_id: context.userId,
      message: data.blocked ? "Usuário bloqueado" : "Usuário reativado",
      metadata: { user_id: data.userId },
    });

    return { ok: true };
  });

export type AdminLog = {
  id: string;
  event_type: string;
  severity: string;
  actor_id: string | null;
  workspace_id: string | null;
  message: string | null;
  metadata: unknown;
  created_at: string;
};

export const listAdminLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(500).default(100) }).parse(d ?? {}),
  )
  .handler(async ({ context, data }): Promise<AdminLog[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as AdminLog[];
  });

export const checkIsSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isSuperAdmin: boolean }> => {
    const { data } = await context.supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isSuperAdmin: !!data };
  });
