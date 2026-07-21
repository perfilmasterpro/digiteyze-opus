import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/config/rbac";
import { __setWorkspaceStore, __clearWorkspaceStore } from "./workspace";

export type AuthProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type AuthWorkspace = {
  id: string;
  name: string;
};

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  workspace: AuthWorkspace | null;
  role: Role | null;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

type ProfileRow = { id: string; email: string | null; display_name: string | null };

async function bootstrapForUser(user: User): Promise<{
  profile: ProfileRow;
  workspace: AuthWorkspace;
  role: Role;
}> {
  // Profile
  let profile: ProfileRow | null = null;
  {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,display_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = data as ProfileRow | null;
  }

  if (!profile) {
    const inserted = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        display_name:
          (user.user_metadata?.display_name as string | undefined) ??
          user.email?.split("@")[0] ??
          null,
      })
      .select("id,email,display_name")
      .single();
    profile = (inserted.data as ProfileRow | null) ?? {
      id: user.id,
      email: user.email ?? null,
      display_name: user.email?.split("@")[0] ?? null,
    };
  }

  // Workspace membership
  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id,name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  let workspace: AuthWorkspace | null = member?.workspaces
    ? { id: member.workspaces.id, name: member.workspaces.name }
    : null;

  if (!workspace) {
    const wsName =
      (user.user_metadata?.workspace_name as string | undefined) ?? "Meu Workspace";
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .insert({ name: wsName })
      .select("id,name")
      .single();
    if (wsErr || !ws) throw wsErr ?? new Error("Falha ao criar workspace");
    workspace = { id: ws.id, name: ws.name };
    await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id });
    await supabase
      .from("user_roles")
      .insert({ user_id: user.id, workspace_id: ws.id, role: "administrador" });
  }

  // Role
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspace.id)
    .limit(1)
    .maybeSingle();

  const role = (roleRow?.role as Role | undefined) ?? "administrador";

  return { profile, workspace, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      setWorkspace(null);
      setRole(null);
      setIsSuperAdmin(false);
      __clearWorkspaceStore();
      setStatus("unauthenticated");
      return;
    }
    try {
      const data = await bootstrapForUser(nextSession.user);
      setProfile({
        id: data.profile.id,
        email: data.profile.email,
        displayName: data.profile.display_name,
      });
      setWorkspace(data.workspace);
      setRole(data.role);
      __setWorkspaceStore({
        workspaceId: data.workspace.id,
        userId: nextSession.user.id,
        userName: data.profile.display_name ?? nextSession.user.email ?? "Usuário",
        role: data.role,
      });
      const { data: sa } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", nextSession.user.id)
        .maybeSingle();
      setIsSuperAdmin(!!sa);
      setStatus("authenticated");
    } catch (err) {
      console.error("[auth] bootstrap failed", err);
      __clearWorkspaceStore();
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) void hydrate(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void hydrate(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await hydrate(data.session);
  }, [hydrate]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      workspace,
      role,
      signOut,
      refresh,
    }),
    [status, session, profile, workspace, role, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
