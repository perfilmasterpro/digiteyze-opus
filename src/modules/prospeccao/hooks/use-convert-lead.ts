import { useMutation, useQueryClient } from "@tanstack/react-query";

import { empresasKeys } from "@/modules/empresas";
import { useCurrentWorkspaceId } from "@/lib/workspace";

import { convertLeadToEmpresa } from "../services/convert-lead.service";
import { leadEventsKeys } from "./use-lead-events";
import { leadsKeys } from "./use-leads";

export function useConvertLead() {
  const workspaceId = useCurrentWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => convertLeadToEmpresa(workspaceId, leadId),
    onSuccess: ({ lead, empresa }) => {
      qc.invalidateQueries({ queryKey: leadsKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: leadsKeys.detail(workspaceId, lead.id) });
      qc.invalidateQueries({ queryKey: leadEventsKeys.all(workspaceId, lead.id) });
      qc.invalidateQueries({ queryKey: empresasKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: empresasKeys.detail(workspaceId, empresa.id) });
    },
  });
}
