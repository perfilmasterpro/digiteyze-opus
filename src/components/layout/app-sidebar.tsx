import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldAlert, Zap } from "lucide-react";

import { useAuth } from "@/lib/auth-context";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_GROUP_LABELS, NAV_ITEMS, type NavItem } from "@/config/navigation";

function useCurrentPath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

function isActive(current: string, to: string) {
  if (to === "/") return current === "/";
  return current === to || current.startsWith(to + "/");
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const current = useCurrentPath();

  const groups = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center gap-2 px-2 py-1.5 text-sidebar-foreground"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">Growth OS</span>
              <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                Digiteyze
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {(Object.keys(groups) as Array<keyof typeof NAV_GROUP_LABELS>).map((groupKey) => (
          <SidebarGroup key={groupKey}>
            {!collapsed && <SidebarGroupLabel>{NAV_GROUP_LABELS[groupKey]}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {groups[groupKey].map((item) => {
                  const Icon = item.icon;
                  const active = isActive(current, item.to);
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.to} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <p className="px-2 pb-1 text-[10px] text-muted-foreground">v0.1 · Fase 0</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
