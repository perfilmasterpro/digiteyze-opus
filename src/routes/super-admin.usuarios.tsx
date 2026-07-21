import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLES, ROLE_LABELS, type Role } from "@/config/rbac";
import { listSuperAdminUsers, setUserBlocked, updateUserRole } from "@/modules/super-admin";

export const Route = createFileRoute("/super-admin/usuarios")({
  component: UsersPage,
});

function UsersPage() {
  const listFn = useServerFn(listSuperAdminUsers);
  const roleFn = useServerFn(updateUserRole);
  const blockFn = useServerFn(setUserBlocked);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "users"],
    queryFn: () => listFn(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["super-admin", "users"] });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; workspaceId: string; role: Role }) => roleFn({ data: v }),
    onSuccess: () => { toast.success("Papel atualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const blockMut = useMutation({
    mutationFn: (v: { userId: string; blocked: boolean }) => blockFn({ data: v }),
    onSuccess: (_, v) => { toast.success(v.blocked ? "Usuário bloqueado" : "Usuário reativado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Workspace</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="font-medium">{u.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                {u.is_super_admin && <Badge className="mt-1" variant="secondary">Super Admin</Badge>}
              </TableCell>
              <TableCell className="text-sm">{u.workspace_name ?? "—"}</TableCell>
              <TableCell>
                {u.workspace_id ? (
                  <Select
                    value={u.role ?? undefined}
                    onValueChange={(v) =>
                      roleMut.mutate({ userId: u.id, workspaceId: u.workspace_id!, role: v as Role })
                    }
                  >
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Definir" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem workspace</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "—"}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => blockMut.mutate({ userId: u.id, blocked: true })}
                >
                  Bloquear
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2"
                  onClick={() => blockMut.mutate({ userId: u.id, blocked: false })}
                >
                  Reativar
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
