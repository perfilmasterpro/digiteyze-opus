import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/super-admin/configuracoes")({
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Configurações Globais</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Estrutura preparada para planos, limites e recursos habilitados. A edição por
          workspace já pode ser feita na aba <strong>Workspaces</strong>.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>• <strong>Planos:</strong> free, starter, pro, enterprise (definidos na tabela <code>workspace_settings</code>).</li>
          <li>• <strong>Limites:</strong> JSONB — evolução futura (ex.: máx. empresas, leads, usuários).</li>
          <li>• <strong>Recursos:</strong> JSONB — flags de features (ex.: IA, WhatsApp, integrações).</li>
          <li>• <strong>Status:</strong> ativo, bloqueado, inativo.</li>
        </ul>
      </div>
    </div>
  );
}
