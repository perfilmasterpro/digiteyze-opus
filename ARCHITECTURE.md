# Arquitetura Oficial — Growth OS

> Documento de referência obrigatório para todas as implementações do projeto.
> Versão: 1.0.0
> Última atualização: Fase 0 — Fundação
> Teste de sincronização com GitHub Sync — 2026-07-28

---

## Objetivo do projeto

O **Growth OS** é a plataforma operacional da Digiteyze para gestão de crescimento digital.

Inicialmente será utilizada internamente pela equipe Digiteyze para unificar processos de vendas, marketing, projetos, suporte, conteúdo, finanças e inteligência artificial. A longo prazo, a plataforma será comercializada como **SaaS multi-tenant** para outras empresas que desejam operar seu crescimento de forma integrada.

Por isso, toda a arquitetura deve ser projetada para:

- Crescimento contínuo de usuários, dados e módulos.
- Reutilização de componentes e padrões entre módulos.
- Isolamento seguro entre tenants/workspaces.
- Evolução sem retrabalho estrutural.

---

## Princípios da arquitetura

Os seguintes princípios são obrigatórios em qualquer implementação:

| Princípio | Descrição |
|-----------|-----------|
| **Modularidade** | Cada domínio de negócio vive em seu próprio módulo, com fronteira clara. |
| **Baixo acoplamento** | Módulos não dependem de implementações internas uns dos outros. |
| **Alta coesão** | Cada arquivo, componente e função tem uma responsabilidade bem definida. |
| **Componentes reutilizáveis** | Toda interface deve reaproveitar os componentes compartilhados. |
| **Responsabilidade única** | Um componente faz uma coisa só. Se cresce demais, deve ser dividido. |
| **Padronização visual** | Toda tela segue o mesmo design system, tokens e comportamentos. |
| **Código limpo** | Nomes claros, funções pequenas, sem duplicação, sem lógica escondida. |
| **Escalabilidade** | Decisões devem suportar dezenas de milhares de registros sem retrabalho. |
| **Multi-tenant** | Toda entidade de negócio deve estar preparada para isolamento por workspace. |
| **Performance** | Carregamento preguiçoso, queries eficientes, estados mínimos. |
| **Segurança** | RBAC central, validação server-side, nenhuma permissão no client-side. |
| **Observabilidade** | Auditoria, notificações e logs devem acompanhar operações importantes. |

---

## Estrutura dos módulos

Cada módulo de negócio é uma unidade independente.

### Regras obrigatórias

1. **Nenhum módulo importa lógica interna de outro módulo.**
   - Exemplo proibido: `import { useLeads } from "@/modules/crm/hooks"` dentro de `marketing`.

2. **Toda comunicação entre módulos ocorre por serviços compartilhados.**
   - Serviços de domínio genérico (ex: `audit`, `notification`, `workspace`, `search`).
   - Eventos/auditoria centralizada.
   - API pública interna bem definida.

3. **Cada módulo possui sua própria estrutura interna:**
   - `routes/` — rotas do módulo.
   - `components/` — componentes específicos do módulo.
   - `hooks/` — hooks do módulo.
   - `services/` — funções de comunicação com backend.
   - `types/` — tipos e interfaces do domínio.
   - `schemas/` — schemas de validação (Zod).

4. **Componentes visuais genéricos ficam em `src/components/common/`.**
   - Nenhum módulo cria sua própria tabela, badge, empty state ou loading.

### Módulos previstos

- **Central** — dashboard de ações e pendências do dia.
- **Empresas** — cadastro e gestão de clientes/parceiros.
- **CRM** — gestão de leads, oportunidades e funil comercial.
- **Prospecção** — prospecção ativa, cold outreach e qualificação.
- **Marketing** — campanhas, canais e performance.
- **Conteúdo** — calendário editorial, pautas e produção.
- **Projetos** — projetos, tarefas, entregas e acompanhamento.
- **Suporte** — chamados, atendimentos e base de conhecimento.
- **Financeiro** — faturamento, cobranças e projeções.
- **IA** — agentes, automações e assistentes.
- **Base de Conhecimento** — documentação e artigos internos.
- **Growth** — experimentos, hipóteses e métricas de growth.
- **Configurações** — usuários, permissões, workspace e integrações.

---

## Design System

Todos os módulos devem utilizar os componentes compartilhados. Não criar componentes duplicados.

### Componentes obrigatórios

| Componente | Uso |
|------------|-----|
| `AppLayout` | Layout base com sidebar, header e conteúdo. |
| `PageHeader` | Título, descrição, ícone e ações da página. |
| `DataTable` | Listagem tabular padronizada com loading e empty state. |
| `FilterBar` | Container de busca, filtros e ações no topo de listas. |
| `StatusBadge` | Badges de status com tons semânticos. |
| `KpiCard` | Cards de indicadores com trend e ícone. |
| `EmptyState` | Estado vazio padronizado. |
| `LoadingState` | Estados de carregamento. |
| `ErrorState` | Estados de erro com retry. |
| `Timeline` | Visualização de histórico e auditoria. |
| `KanbanBoard` | Quadros de pipeline (CRM, projetos, suporte). |
| `ConfirmDialog` | Diálogos de confirmação de ações destrutivas. |

### Outros componentes compartilhados

- `SearchInput` — campo de busca com ícone e limpar.
- `ModulePlaceholder` — tela de módulo em construção.
- `NotificationsPanel` — painel central de notificações.
- `GlobalSearch` — command palette de busca global.
- `AppSidebar` / `AppHeader` — chrome da aplicação.

### Regras de uso

- Sempre preferir o componente compartilhado antes de criar um novo.
- Se um componente de módulo se repete em mais de um lugar, ele deve ser promovido para `src/components/common/`.
- Nenhum componente visual pode conter lógica de negócio.

---

## Padrões de Interface

Toda a interface segue os tokens do design system definidos em `src/styles.css`.

### Tipografia

- **Títulos de página:** `text-xl font-semibold tracking-tight sm:text-2xl`.
- **Subtítulos/seções:** `text-base font-semibold`.
- **Corpo:** `text-sm` padrão.
- **Texto secundário:** `text-muted-foreground`.
- **Labels/uppercase:** `text-xs font-medium uppercase tracking-wider`.
- Não usar fontes hardcoded. Usar os tokens do tema.

### Espaçamentos

- Container máximo de conteúdo: `max-w-7xl`.
- Padding interno das páginas: `px-4 py-6 md:px-6 md:py-8`.
- Espaçamento entre seções: `gap-6`.
- Espaçamento entre itens relacionados: `gap-2` / `gap-3`.
- Cards e tabelas usam `rounded-lg border bg-card`.

### Ícones

- Biblioteca padrão: **Lucide React**.
- Ícones de ação: `h-4 w-4`.
- Ícones em cards/header: `h-5 w-5`.
- Ícones grandes (empty/error states): `h-5 w-5` dentro de círculo `h-12 w-12`.

### Botões

- Ações primárias: `Button` padrão.
- Ações secundárias: `variant="outline"`.
- Ações destrutivas: `variant="destructive"`.
- Ações de ícone: `variant="ghost" size="icon"`.
- Tamanho padrão em barras de ação: `size="sm"`.

### Inputs

- Altura padrão: `h-9`.
- Busca: `SearchInput` com `pl-8 pr-8`.
- Foco consistente com ring do shadcn.
- Estados de erro com `aria-invalid`.

### Cards

- Fundo: `bg-card`.
- Borda: `border`.
- Cantos: `rounded-lg`.
- Sombra: `shadow-sm` apenas quando necessário.

### Badges

- Usar `StatusBadge` com tons semânticos:
  - `neutral` — inativo, rascunho, pendente.
  - `info` — em andamento, aguardando.
  - `success` — concluído, ativo, pago.
  - `warning` — alerta, atraso parcial.
  - `destructive` — erro, cancelado, crítico.
  - `primary` — destaque, principal.

### Estados

Toda tela com dados deve prever:

1. **Loading** — `LoadingState` ou `TableSkeleton`.
2. **Empty** — `EmptyState` com título, descrição e ação quando aplicável.
3. **Error** — `ErrorState` com retry.
4. **Success/feedback** — toast ou badge atualizado.

### Responsividade

- Mobile-first.
- Sidebar colapsável em telas pequenas.
- Tabelas com scroll horizontal quando necessário.
- Filtros empilhados em telas pequenas (`flex-wrap`).
- Header adaptativo com `hidden md:block` para elementos secundários.

### Tema claro/escuro

- Usar tokens CSS do shadcn (`bg-background`, `text-foreground`, `bg-card`, `border`, etc.).
- Nunca hardcodar cores (`text-white`, `bg-black`, `bg-[#...]`).
- Todos os componentes devem funcionar nos dois temas sem ajustes.

---

## Padrões de Código

### Separação por responsabilidade

| Camada | Responsabilidade |
|--------|------------------|
| `routes/` | Roteamento, loader e composição de página. |
| `components/` | Apresentação visual. Sem regras de negócio. |
| `hooks/` | Estado local, efeitos e composição reutilizável. |
| `services/` | Comunicação com backend, parsing e normalização. |
| `types/` | Contratos de dados e domínio. |
| `schemas/` | Validação de entrada com Zod. |
| `config/` | Configuração global (RBAC, navegação). |
| `lib/` | Utilitários puros e helpers. |

### Componentes pequenos

- Se um componente passa de ~120 linhas, dividir.
- Cada componente deve ter um nome claro e único propósito.
- Props tipadas com TypeScript.

### Hooks reutilizáveis

- Hooks de módulo começam com o nome do domínio: `useLeads`, `useCampaigns`.
- Hooks genéricos vão em `src/hooks/`: `useMobile`, `useDebounce`, etc.
- Nunca colocar chamadas de API diretamente em componentes visuais.

### Services separados

- Toda chamada a backend passa por um service.
- Services retornam dados tipados e tratam erros.
- Services genéricos (auth, workspace, audit, notification) são compartilhados.

### Tipos centralizados

- Tipos de domínio em `src/types/` ou `src/modules/<nome>/types/`.
- Não repetir tipos em múltiplos arquivos.
- Preferir `interface` para contratos de API e `type` para uniões/utilitários.

### Sem lógica de negócio em componentes visuais

- Componentes renderizam estado.
- Hooks e services calculam, validam e decidem.
- Regras de permissão vêm do RBAC central, nunca hardcoded no componente.

---

## Permissões

Toda autorização utiliza o RBAC centralizado em `src/config/rbac.ts`.

### Regras obrigatórias

1. **Nenhum módulo implementa suas próprias permissões.**
   - Não criar `isAdmin`, `canEdit` locais dentro de módulos.

2. **Papéis são definidos centralmente:**
   - `administrador`
   - `gestor`
   - `operacional`
   - `financeiro`
   - `marketing`
   - `comercial`
   - `desenvolvimento`
   - `suporte`

3. **Permissões seguem o padrão:**
   ```
   <module>:<action>
   ```
   Exemplos:
   - `crm:view`
   - `crm:create`
   - `crm:update`
   - `crm:delete`
   - `financeiro:approve`
   - `marketing:export`

4. **Ações padrão:**
   - `view`
   - `create`
   - `update`
   - `delete`
   - `approve`
   - `export`

5. **Verificação no client-side é apenas para UX.**
   - Esconder botões sem permissão melhora a experiência, mas não garante segurança.
   - Toda permissão crítica deve ser revalidada no servidor (RLS / middleware / server functions).

6. **Módulos visíveis por papel são definidos em `DEFAULT_ROLE_MODULES`.**
   - Futuramente, permissões poderão ser customizadas por workspace.

---

## Multi-tenant

Toda entidade de negócio deve estar preparada para isolamento por tenant/workspace.

### Regras obrigatórias

1. **Nenhum módulo pode assumir um único cliente ou tenant.**
2. **Toda tabela de domínio de negócio deve conter `workspace_id` (ou equivalente).**
3. **Toda query de dados deve filtrar por `workspace_id`.**
4. **RLS deve garantir que usuários só acessem dados do workspace atual.**
5. **Usuários podem pertencer a múltiplos workspaces no futuro.**
   - A sessão deve carregar o workspace ativo.
   - Switch de workspace será implementado posteriormente.

### Preparação na Fase 0

- Estrutura de auth e contexto deve suportar workspace.
- Componentes e services devem receber `workspace_id` como parâmetro quando necessário.
- Nenhum dado de negócio é criado sem associação a workspace.

---

## Auditoria

Toda operação importante deverá gerar eventos de auditoria.

### Operações que devem ser auditadas

- Criação, atualização e exclusão de registros.
- Aprovações e reprovações.
- Alterações de status.
- Login/logout e alterações de sessão.
- Alterações de permissões e papéis.
- Exportação e importação de dados.
- Ações administrativas.

### Formato do evento (futuro)

```ts
interface AuditEvent {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;        // ex: "lead:update"
  resource: string;      // ex: "leads"
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
```

### Diretriz para implementação futura

- Criar service central `audit.logEvent()`.
- Chamar automaticamente em services de domínio.
- Expor timeline de auditoria via componente `Timeline`.
- Não implementar nesta fase, apenas preparar os pontos de chamada.

---

## Notificações

Toda funcionalidade futura deve considerar integração com o sistema central de notificações.

### Tipos de notificação previstos

- **In-app** — badge e painel de notificações.
- **E-mail** — envio assíncrono via fila.
- **WhatsApp** — integração futura.
- **Push** — integração futura.

### Quando notificar

- Uma tarefa é atribuída a um usuário.
- Um lead muda de status.
- Uma homologação é aprovada/reprovada.
- Um chamado recebe resposta.
- Uma campanha termina.
- Uma cobrança vence.

### Diretriz para implementação futura

- Criar service central `notification.send()`.
- Cada módulo dispara notificações através do service compartilhado.
- Painel de notificações já existe como placeholder em `NotificationsPanel`.
- Não implementar nesta fase, apenas preparar os pontos de integração.

---

## Convenções

### Nomes de arquivos

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes | kebab-case.tsx | `page-header.tsx` |
| Hooks | use-<nome>.ts | `use-leads.ts` |
| Services | <dominio>.service.ts | `leads.service.ts` |
| Tipos | <dominio>.types.ts | `leads.types.ts` |
| Schemas | <dominio>.schema.ts | `leads.schema.ts` |
| Rotas | <caminho>.tsx | `crm.tsx`, `leads.$id.tsx` |
| Utilitários | kebab-case.ts | `format-date.ts` |
| Configuração | kebab-case.ts | `navigation.ts`, `rbac.ts` |

### Nomes de componentes

- PascalCase.
- Nome descritivo do que representa.
- Exemplos: `PageHeader`, `StatusBadge`, `KanbanBoard`, `LeadCard`.

### Nomes de hooks

- começam com `use`.
- Descrevem o domínio ou comportamento.
- Exemplos: `useLeads`, `useDebounce`, `useMobile`.

### Nomes de services

- Funções nomeadas por ação e domínio.
- Exemplos: `getLeads`, `createLead`, `updateCampaignStatus`.

### Rotas

- Usar file-based routing do TanStack Start.
- Caminhos em português quando representam módulos de negócio: `/crm`, `/projetos`, `/financeiro`.
- Parâmetros dinâmicos com `$`: `leads.$id.tsx` → `/leads/:id`.
- Nunca usar `src/pages/`.

### Tipos e interfaces

- Dominar com `interface` para contratos de dados.
- Usar `type` para uniões, enums e aliases.
- Tipos de permissão: `Permission = "<module>:<action>"`.
- Exportar tipos compartilhados; manter tipos locais quando exclusivos.

---

## Checklist obrigatório para novos módulos

Antes de um módulo ser considerado concluído, ele deve atender a todos os itens abaixo:

- [ ] **Responsivo** — funciona em desktop, tablet e mobile.
- [ ] **Permissões** — utiliza RBAC central para visualização e ações.
- [ ] **Loading** — possui estado de carregamento em todas as listas e ações.
- [ ] **Empty State** — exibe estado vazio quando não há dados.
- [ ] **Error State** — exibe estado de erro com ação de retry.
- [ ] **Auditoria preparada** — pontos de criação/alteração/exclusão prontos para gerar eventos.
- [ ] **Notificações preparadas** — eventos relevantes prontos para disparar notificações.
- [ ] **Componentes reutilizados** — usa `DataTable`, `PageHeader`, `StatusBadge`, etc.
- [ ] **Sem duplicação** — nenhum componente ou hook duplicado de outro módulo.
- [ ] **Seguindo Design System** — tipografia, cores, espaçamento e tokens corretos.

---

## Resumo das decisões arquiteturais documentadas

1. **Nome do sistema:** Growth OS, posicionado como sistema operacional de crescimento da Digiteyze e futuro SaaS multi-tenant.
2. **Arquitetura modular e desacoplada:** módulos não compartilham lógica interna; comunicam apenas por serviços compartilhados.
3. **Design System unificado:** todos os módulos reutilizam componentes em `src/components/common/` para garantir consistência visual.
4. **Padrões de interface rígidos:** tokens do shadcn, mobile-first, estados obrigatórios (loading, empty, error), tema claro/escuro.
5. **Padrões de código por responsabilidade:** componentes visuais sem lógica de negócio, hooks e services separados, tipos centralizados.
6. **RBAC centralizado:** todas as permissões passam por `src/config/rbac.ts`; nenhum módulo implementa permissões próprias.
7. **Multi-tenant desde a fundação:** toda entidade de negócio deve suportar `workspace_id` e isolamento por tenant.
8. **Auditoria e notificações centralizadas:** services futuros `audit.logEvent()` e `notification.send()` serão consumidos por todos os módulos.
9. **Convenções claras:** padronização de nomes de arquivos, componentes, hooks, services, rotas e tipos.
10. **Checklist obrigatório:** todo módulo deve ser responsivo, seguro, com estados completos e preparado para auditoria/notificações antes de ser considerado concluído.

---

> Este documento deve ser consultado antes de qualquer nova implementação. Alterações na arquitetura só devem ocorrer mediante revisão e aprovação explícita.
