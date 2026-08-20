import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/super-admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — Growth OS" },
      { name: "description", content: "Painel de administração global do Growth OS." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Super Admin — Growth OS" },
      { property: "og:description", content: "Administração global de workspaces, usuários e logs." },
    ],
  }),
  component: SuperAdminLayout,
});

const TABS: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/super-admin", label: "Dashboard", exact: true },
  { to: "/super-admin/workspaces", label: "Workspaces" },
  { to: "/super-admin/usuarios", label: "Usuários" },
  { to: "/super-admin/logs", label: "Logs" },
  { to: "/super-admin/webhooks", label: "Webhooks" },
  { to: "/super-admin/configuracoes", label: "Configurações" },
];

function SuperAdminLayout() {
  const { status, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated" && !isSuperAdmin) {
      void navigate({ to: "/", replace: true });
    }
  }, [status, isSuperAdmin, navigate]);

  if (status === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">Acesso restrito</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é exclusiva para Super Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Administração global da plataforma Growth OS.
        </p>
      </div>
      <nav className="flex flex-wrap items-center gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact ?? false }}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
