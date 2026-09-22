import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, LayoutDashboard, Menu, Search, Target } from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NAV_GROUP_LABELS, NAV_ITEMS, type NavItem } from "@/config/navigation";
import { useAuth } from "@/lib/auth-context";
import { GooglePlacesDialog, OpenPlacesDialog } from "@/modules/prospeccao";

function isActive(current: string, to: string) {
  if (to === "/") return current === "/";
  return current === to || current.startsWith(to + "/");
}

const MOBILE_PRIMARY_ROUTES = new Set(["/", "/agente", "/prospeccao"]);

export function MobileBottomNav() {
  const current = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [googlePlacesOpen, setGooglePlacesOpen] = useState(false);
  const [openPlacesOpen, setOpenPlacesOpen] = useState(false);

  const remainingItems = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_ROUTES.has(item.to));
  const groups = remainingItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const menuActive = remainingItems.some((item) => isActive(current, item.to)) ||
    (isSuperAdmin && isActive(current, "/super-admin"));

  function openGooglePlaces() {
    setLeadSearchOpen(false);
    setGooglePlacesOpen(true);
  }

  function openOpenPlaces() {
    setLeadSearchOpen(false);
    setOpenPlacesOpen(true);
  }

  return (
    <>
      <nav
        aria-label="Navegação principal mobile"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        <div className="mx-auto flex h-[4.5rem] max-w-lg items-end justify-around px-1">
          <Link
            to="/"
            aria-current={isActive(current, "/") ? "page" : undefined}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium"
          >
            <LayoutDashboard className={`h-5 w-5 ${isActive(current, "/") ? "text-primary" : "text-muted-foreground"}`} />
            <span className={isActive(current, "/") ? "text-primary" : "text-muted-foreground"}>Central</span>
          </Link>

          <button
            type="button"
            onClick={() => setLeadSearchOpen(true)}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-muted-foreground"
          >
            <Search className="h-5 w-5" />
            <span>Buscar Leads</span>
          </button>

          <Link
            to="/agente"
            aria-current={isActive(current, "/agente") ? "page" : undefined}
            className="relative -mt-5 flex min-w-0 flex-1 flex-col items-center justify-end gap-1 px-1 pb-1 text-xs font-semibold"
          >
            <span
              className={`grid h-14 w-14 place-items-center rounded-full border-4 border-background shadow-lg transition-transform ${isActive(current, "/agente") ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"}`}
            >
              <Bot className="h-7 w-7" />
            </span>
            <span className={isActive(current, "/agente") ? "text-primary" : "text-foreground"}>Agente IA</span>
          </Link>

          <Link
            to="/prospeccao"
            aria-current={isActive(current, "/prospeccao") ? "page" : undefined}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium"
          >
            <Target className={`h-5 w-5 ${isActive(current, "/prospeccao") ? "text-primary" : "text-muted-foreground"}`} />
            <span className={isActive(current, "/prospeccao") ? "text-primary" : "text-muted-foreground"}>Prospecção</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium"
          >
            <Menu className={`h-5 w-5 ${menuActive ? "text-primary" : "text-muted-foreground"}`} />
            <span className={menuActive ? "text-primary" : "text-muted-foreground"}>Menu</span>
          </button>
        </div>
      </nav>

      <Dialog open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Buscar Leads</DialogTitle>
            <DialogDescription>Escolha uma das buscas que já existem na Prospecção.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={openGooglePlaces}
              className="flex min-h-16 items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted"
            >
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <strong className="block text-sm">Buscar no Google Maps</strong>
                <span className="text-xs text-muted-foreground">Pesquisar empresas por categoria e localização.</span>
              </span>
            </button>

            <button
              type="button"
              onClick={openOpenPlaces}
              className="flex min-h-16 items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted"
            >
              <Target className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <strong className="block text-sm">Buscar empresas (grátis)</strong>
                <span className="text-xs text-muted-foreground">Pesquisar por segmento, cidade ou CNPJ.</span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
            <DialogDescription>Todas as outras funcionalidades do Growth OS.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {(Object.keys(groups) as Array<keyof typeof NAV_GROUP_LABELS>).map((groupKey) => (
              <section key={groupKey} className="space-y-2">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {NAV_GROUP_LABELS[groupKey]}
                </h3>
                <div className="grid gap-1">
                  {groups[groupKey].map((item) => {
                    const Icon = item.icon;
                    const active = isActive(current, item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-medium">{item.label}</span>
                          {item.description ? (
                            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}

            {isSuperAdmin ? (
              <section className="space-y-2">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sistema</h3>
                <Link
                  to="/super-admin"
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive(current, "/super-admin") ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <Menu className="h-5 w-5 shrink-0" />
                  <span className="font-medium">Super Admin</span>
                </Link>
              </section>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <GooglePlacesDialog open={googlePlacesOpen} onOpenChange={setGooglePlacesOpen} />
      <OpenPlacesDialog open={openPlacesOpen} onOpenChange={setOpenPlacesOpen} />
    </>
  );
}
