import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { WebhookService } from "../services/webhook.service";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { WebhookLog } from "../types/webhook.types";

export function WebhookLogsList() {
  const workspaceId = getCurrentWorkspaceId();
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['webhook-logs', workspaceId],
    queryFn: () => WebhookService.listLogs(workspaceId!),
    enabled: !!workspaceId
  });

  if (isLoading) return <div>Carregando logs...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Eventos de Webhook (ZapZap)</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Lead Match</TableHead>
              <TableHead>Instância</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>

          </TableHeader>
          <TableBody>
            {logs?.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum evento recebido ainda.
                </TableCell>
              </TableRow>
            )}

            {logs?.data?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.event}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.sender_phone || 'N/A'}</span>
                    {log.receiver_phone && (
                      <span className="text-xs text-muted-foreground">Para: {log.receiver_phone}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {log.lead_match_status ? (
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={
                          log.lead_match_status === 'matched' ? 'default' : 
                          log.lead_match_status === 'ambiguous' ? 'outline' : 
                          'secondary'
                        }
                        className={
                          log.lead_match_status === 'ambiguous' ? 'border-amber-500 text-amber-600' : ''
                        }
                      >
                        {log.lead_match_status}
                      </Badge>
                      {log.lead_id && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
                          {log.lead_id}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm font-mono text-muted-foreground">{log.instance_id}</span>
                </TableCell>

                <TableCell>
                  <Badge 
                    variant={log.status === 'pending' ? 'secondary' : log.status === 'processed' ? 'default' : 'destructive'}
                  >
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        Ver Payload
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Evento: {log.event} ({log.external_id || log.id})</DialogTitle>
                      </DialogHeader>
                      <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-xs">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
