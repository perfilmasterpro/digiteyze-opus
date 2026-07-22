import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { can } from "@/config/rbac";
import { useCurrentRole } from "@/hooks/use-current-role";

import {
  useCreateCategory,
  useDeleteCategory,
  useMessageCategories,
  useReorderCategories,
  useUpdateCategory,
} from "../hooks/use-message-categories";
import {
  DEFAULT_CATEGORY_COLOR,
  toCategorySlug,
  type MessageCategory,
} from "../types/message-categories.types";

/**
 * Painel de gestão das categorias da Biblioteca de Mensagens.
 *
 * As cores editadas aqui são compartilhadas por qualquer módulo que consuma
 * `useMessageCategoryColor(slug)` (Biblioteca de Mensagens, Kanban de Leads,
 * Cadências comerciais).
 */
export function CategoryManager() {
  const role = useCurrentRole();
  const canManage = can(role, "mensagens:create") || can(role, "mensagens:update");

  const { data = [], isLoading } = useMessageCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const reorderMut = useReorderCategories();

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [data],
  );

  const [deleting, setDeleting] = useState<MessageCategory | null>(null);

  // Formulário de nova categoria
  const [newNome, setNewNome] = useState("");
  const [newCor, setNewCor] = useState(DEFAULT_CATEGORY_COLOR);

  async function handleCreate() {
    const nome = newNome.trim();
    if (nome.length < 2) {
      toast.error("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    const slug = toCategorySlug(nome);
    if (!slug) {
      toast.error("Nome inválido.");
      return;
    }
    if (sorted.some((c) => c.slug === slug)) {
      toast.error("Já existe uma categoria com esse identificador.");
      return;
    }
    try {
      const nextOrder = (sorted.at(-1)?.ordem ?? 0) + 1;
      await createMut.mutateAsync({
        slug,
        nome,
        cor: newCor,
        ativo: true,
        ordem: nextOrder,
      });
      setNewNome("");
      setNewCor(DEFAULT_CATEGORY_COLOR);
      toast.success("Categoria criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar categoria");
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const idx = sorted.findIndex((c) => c.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[idx], next[target]] = [next[target], next[idx]];
    try {
      await reorderMut.mutateAsync(next.map((c) => c.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Categoria removida");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Seu papel não tem permissão para gerenciar categorias.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4">
        <h4 className="text-sm font-medium">Nova categoria</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O identificador é gerado a partir do nome e usado para vincular categorias
          existentes.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="cat-nome">Nome</Label>
            <Input
              id="cat-nome"
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              placeholder="Ex.: Onboarding"
              maxLength={60}
            />
            {newNome.trim().length >= 2 && (
              <p className="text-[10px] text-muted-foreground">
                Slug: <code>{toCategorySlug(newNome)}</code>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-cor">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cat-cor"
                type="color"
                value={newCor}
                onChange={(e) => setNewCor(e.target.value)}
                className="h-9 w-14 p-1"
              />
              <Input
                value={newCor}
                onChange={(e) => setNewCor(e.target.value)}
                maxLength={9}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={createMut.isPending} className="gap-2">
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Categorias</h4>
          <span className="text-xs text-muted-foreground">{sorted.length} no total</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando categorias...
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nenhuma categoria cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {sorted.map((cat, index) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                onChange={(patch) =>
                  updateMut.mutate({ id: cat.id, patch })
                }
                onMoveUp={index > 0 ? () => move(cat.id, -1) : undefined}
                onMoveDown={index < sorted.length - 1 ? () => move(cat.id, 1) : undefined}
                onDelete={() => setDeleting(cat)}
              />
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{deleting?.nome}" será removida. Templates que a utilizavam
              continuarão existindo, mas ficarão sem cor personalizada até serem
              reclassificados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type RowProps = {
  cat: MessageCategory;
  onChange: (patch: Partial<Pick<MessageCategory, "nome" | "cor" | "ativo">>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
};

function CategoryRow({ cat, onChange, onMoveUp, onMoveDown, onDelete }: RowProps) {
  const [nome, setNome] = useState(cat.nome);
  const [cor, setCor] = useState(cat.cor);

  useEffect(() => {
    setNome(cat.nome);
    setCor(cat.cor);
  }, [cat.id, cat.nome, cat.cor]);

  function commitNome() {
    const next = nome.trim();
    if (next.length < 2 || next === cat.nome) {
      setNome(cat.nome);
      return;
    }
    onChange({ nome: next });
  }
  function commitCor(next: string) {
    setCor(next);
    if (next !== cat.cor) onChange({ cor: next });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <span
        aria-hidden
        className="h-6 w-6 shrink-0 rounded-full border"
        style={{ backgroundColor: cor }}
      />
      <div className="min-w-[160px] flex-1">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={commitNome}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="h-8"
        />
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          <code>{cat.slug}</code>
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="color"
          value={cor}
          onChange={(e) => commitCor(e.target.value)}
          className="h-8 w-12 p-1"
          aria-label="Cor"
        />
        <Input
          value={cor}
          onChange={(e) => setCor(e.target.value)}
          onBlur={() => commitCor(cor)}
          className="h-8 w-24 text-xs"
          maxLength={9}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch
          checked={cat.ativo}
          onCheckedChange={(v) => onChange({ ativo: v })}
        />
        {cat.ativo ? "Ativa" : "Inativa"}
      </label>
      <Badge variant="outline" className="text-[10px]">
        #{cat.ordem}
      </Badge>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={!onMoveUp}
          aria-label="Mover para cima"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={!onMoveDown}
          aria-label="Mover para baixo"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Remover">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}
