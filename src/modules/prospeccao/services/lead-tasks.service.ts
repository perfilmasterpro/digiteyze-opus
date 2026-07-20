import type {
  LeadTask,
  LeadTaskInput,
  LeadTaskStatus,
} from "../types/entities.types";

const STORAGE_KEY = "growth-os:lead-tasks";

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): LeadTask[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeadTask[];
    if (!Array.isArray(parsed)) return [];
    // Compat: registros antigos podem não ter `prioridade`.
    return parsed.map((t) => (t.prioridade ? t : { ...t, prioridade: "media" as const }));
  } catch {
    return [];
  }
}

function writeAll(list: LeadTask[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId() {
  if (isBrowser() && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `tsk_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function listLeadTasks(
  workspaceId: string,
  leadId: string,
): Promise<LeadTask[]> {
  return readAll()
    .filter((t) => t.workspace_id === workspaceId && t.lead_id === leadId)
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "pendente") return -1;
        if (b.status === "pendente") return 1;
      }
      const ad = a.data ?? "9999";
      const bd = b.data ?? "9999";
      return ad < bd ? -1 : ad > bd ? 1 : 0;
    });
}

export async function createLeadTask(
  workspaceId: string,
  leadId: string,
  input: LeadTaskInput,
): Promise<LeadTask> {
  const now = new Date().toISOString();
  const task: LeadTask = {
    id: generateId(),
    workspace_id: workspaceId,
    lead_id: leadId,
    titulo: input.titulo,
    data: input.data,
    status: "pendente",
    prioridade: input.prioridade ?? "media",
    responsavel_id: input.responsavel_id,
    created_at: now,
    updated_at: now,
  };
  const list = readAll();
  list.unshift(task);
  writeAll(list);
  return task;
}

export async function updateLeadTaskStatus(
  workspaceId: string,
  id: string,
  status: LeadTaskStatus,
): Promise<LeadTask> {
  const list = readAll();
  const idx = list.findIndex((t) => t.id === id && t.workspace_id === workspaceId);
  if (idx === -1) throw new Error("Tarefa não encontrada");
  const updated: LeadTask = {
    ...list[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  list[idx] = updated;
  writeAll(list);
  return updated;
}
