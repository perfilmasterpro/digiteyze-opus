import { LogOut, Settings, UserCircle } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

export function UserMenu() {
  const { profile, user, workspace, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.displayName ?? user?.email?.split("@")[0] ?? "Usuário";
  const email = user?.email ?? "";

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/auth" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {displayName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
          {workspace ? (
            <span className="mt-1 text-xs font-normal text-muted-foreground">
              {workspace.name}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <UserCircle className="mr-2 h-4 w-4" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
