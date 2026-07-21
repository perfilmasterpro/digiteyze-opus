import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { listSuperAdminWorkspaces, updateWorkspaceSettings } from "@/modules/super-admin";

export const Route = createFileRoute("/super-admin/workspaces")({
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const listFn = useServerFn(listSuperAdminWorkspaces);
  const updateFn = useServerFn(updateWorkspaceSettings);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin", "workspaces"],
    queryFn: () => listFn(),
  });

  const mut = useMutation({
    mutationFn: (v: { workspaceId: string; plan?: string; status?: "active" | "blocked" | "inactive" }) =>
      updateFn({ data: v }),
    onSuccess: () => {
      toast.success("Workspace atualizado");
      qc.invalidateQueries({ queryKey: ["super-admin", "workspaces"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Proprietário</TableHead>
            <TableHead>Usuários</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((w) => (
            <WorkspaceRow key={w.id} ws={w} onSave={(v) => mut.mutate({ workspaceId: w.id, ...v })} />
          ))}
          {data?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                Nenhum workspace encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function WorkspaceRow({
  ws,
  onSave,
}: {
  ws: Awaited<ReturnType<typeof listSuperAdminWorkspaces>>[number];
  onSave: (v: { plan?: string; status?: "active" | "blocked" | "inactive" }) => void;
}) {
  const [plan, setPlan] = useState(ws.plan);
  const [status, setStatus] = useState<"active" | "blocked" | "inactive">(
    (ws.status as "active" | "blocked" | "inactive") ?? "active",
  );
  const dirty = plan !== ws.plan || status !== ws.status;

  return (
    <TableRow>
      <TableCell className="font-medium">{ws.name}</TableCell>
      <TableCell>
        <div className="text-sm">{ws.owner_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{ws.owner_email ?? "—"}</div>
      </TableCell>
      <TableCell>{ws.member_count}</TableCell>
      <TableCell>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(ws.created_at).toLocaleDateString("pt-BR")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty}
            onClick={() => onSave({ plan, status })}
          >
            Salvar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
