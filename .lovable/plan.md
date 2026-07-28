> Nada foi alterado no código. Plano técnico revisado (v2) para aprovação.

## 1. Análise da arquitetura atual

**Stack e organização**
- TanStack Start (React 19 + TS), rotas flat em `src/routes/*`, layout global em `__root.tsx` / `AppLayout`.
- Domínios isolados em `src/modules/<modulo>/{components,services,hooks,types}` (`ARCHITECTURE.md`).
- Lovable Cloud (Postgres) com RLS multi-tenant via `is_workspace_member(workspace_id)` e RBAC via `has_role(workspace_id, role)`; `getCurrentWorkspaceId()` em `src/lib/workspace.ts`; sessão em `src/lib/auth-context.tsx`.
- IA server-side com `createServerFn` (`*.functions.ts`) + Lovable AI Gateway (`LOVABLE_API_KEY` já configurada, nunca exposta ao browser).

**Módulos que se conectam**
| Módulo | Conexão |
|---|---|
| Central (`src/modules/central`) | Destino principal: converter rascunho em `tasks` (prioridade, prazo, checklist, anexos, recorrência) |
| Prospecção / CRM / Empresas | Vincular captura a lead/oportunidade/empresa e registrar em `lead_events` / `empresa_events` |
| Projetos | Tipo "Projeto" gera tarefa-mãe com checklist enquanto o módulo Projetos não tiver tabela própria |
| Base de Conhecimento | Tipo "Nota" pode virar artigo da wiki |
| IA (`/ia`) | Histórico de processamento, consumo e o futuro Resumo IA Diário |

**Reuso direto**
- Serviços: `central/services/tasks.service.ts`, `attachments.service.ts`, `central-aggregator.ts`, `ai-suggestions.ts`, `empresa-events.service.ts`, `lead-events.service.ts`.
- Componentes: `DataTable`, `KanbanBoard`, `PriorityBadge`, drawers/dialogs do design system.
- Infra: React Query, Zod, RLS/RBAC, enums `task_prioridade`, `task_categoria`, `task_status` e `task_origem` (adicionar valor `inbox_ia`).

## 2. Captura multimodal (ajuste 1)

Três formas de entrada, todas convergindo para o mesmo registro em `inbox_ai`:

1. **Voz** — gravação no navegador (Web Audio API → WAV 16 kHz mono, arquivo completo, evitando fragmentos do MediaRecorder), transcrição server-side.
2. **Texto digitado** — campo livre no mesmo dialog (aba "Escrever"), sem custo de STT.
3. **Colar conteúdo externo** — aba "Colar" com detecção de `onPaste`: texto longo, e-mail, mensagem de WhatsApp, ata de reunião ou URL. Metadados guardados em `origem_detalhe` (ex.: `whatsapp`, `email`, `url`, `texto`). Se for URL, a IA usa apenas o texto colado (sem fetch externo no MVP).

O campo `origem` do registro passa a ser enum `inbox_origem`: `voz` | `texto` | `colado`.

## 3. Conceito "Rascunho Inteligente" (ajuste 2)

Toda captura — independentemente da origem — **entra sempre na Inbox como rascunho pendente**. Nada é criado automaticamente em outros módulos.

Ciclo de vida do rascunho:
```text
capturado → processando → sugerido → (aprovado | descartado)
                        ↘ erro (mantém o conteúdo bruto)
```
- A IA preenche apenas **sugestões** (`tipo_sugerido`, `titulo`, `descricao`, `categoria`, `prioridade`, `prazo_sugerido`, `proximas_acoes`).
- O usuário revisa, edita e escolhe o destino: **Tarefa**, **Projeto**, **Nota**, **Lembrete** ou manter na Inbox.
- Só na conversão explícita o registro em `tasks` (ou nota/projeto) é criado, com `origem='inbox_ia'` e `origem_ref_id = inbox_ai.id`.
- Cada campo alterado pelo usuário é registrado em `correcoes` (jsonb) — base para o aprendizado futuro.
- Rascunho sem ação permanece na Inbox com contador de dias parados ("envelhecimento"), destacado na lista.

## 4. Memória de contexto da IA (ajuste 3)

Antes de classificar, uma função server-side monta um **contexto compacto do workspace** (somente leitura, respeitando RLS):

| Fonte | O que entra no contexto | Limite |
|---|---|---|
| Projetos ativos | nomes distintos de `tasks.projeto` (e depois a tabela `projects`) | ~30 |
| Empresas | nome/apelido de `empresas` recentes | ~50 |
| Leads | nome da empresa + etapa de `leads` ativos | ~50 |
| Tarefas abertas | título + prazo de `tasks` não concluídas | ~30 |
| Histórico aprovado | últimos rascunhos aprovados: texto → classificação final (few-shot) | ~10 |
| Categorias | enum `task_categoria` + categorias do workspace | todas |

Regras:
- O contexto é montado **no servidor**, nunca enviado pelo cliente, e sempre filtrado por `workspace_id`.
- Cacheado por alguns minutos (`workspace_ai_context`, em memória/consulta leve) para não pesar em cada captura.
- Enviado no prompt de sistema como listas curtas; a IA deve **escolher entre os valores existentes** para projeto/empresa/lead e retornar `null` quando não houver correspondência confiável — evitando inventar entidades.
- Data de hoje incluída para resolver "sexta que vem", "amanhã", etc.

## 5. Estrutura de dados (Supabase)

**`inbox_ai`**
- `id`, `workspace_id`, `criado_por`
- `origem` (`inbox_origem`), `origem_detalhe` (text), `audio_path`, `duracao_seg`
- `conteudo_raw` (texto digitado/colado ou transcrição), `conteudo_editado`
- `tipo_sugerido` / `tipo_confirmado` (`inbox_tipo`: ideia | tarefa | projeto | lembrete | nota)
- `titulo`, `descricao`, `categoria`, `prioridade` (`task_prioridade`), `prazo_sugerido` (date)
- `projeto_sugerido`, `empresa_id`, `lead_id` (nullable)
- `proximas_acoes` (jsonb), `ai_payload` (jsonb), `confianca` (numeric), `correcoes` (jsonb)
- `status` (`inbox_status`), `convertido_em_tipo`, `convertido_em_id`
- `created_at`, `updated_at`

**`ai_processing_logs`**
- `id`, `workspace_id`, `user_id`, `inbox_id`
- `etapa`: `transcricao` | `classificacao` | `resumo_diario`
- `modelo`, `tokens_input`, `tokens_output`, `audio_seg`, `latencia_ms`, `custo_estimado`
- `status`, `erro`, `created_at`

**`ai_daily_digests`** (Etapa 3, já modelada)
- `id`, `workspace_id`, `user_id`, `data` (date), `resumo` (text), `destaques` (jsonb), `ai_payload` (jsonb), `created_at` — único por (`workspace_id`, `user_id`, `data`).

**`inbox_categories`** (Etapa 2, opcional) — `slug`, `nome`, `cor`, `ordem`, no padrão de `message_categories`.

**Relacionamentos**
```text
workspaces 1─N inbox_ai 1─N ai_processing_logs
inbox_ai 0..1─1 tasks           (convertido_em_id ↔ tasks.origem_ref_id)
inbox_ai 0..1─1 empresas | leads (vínculo opcional)
workspaces 1─N ai_daily_digests
```

**Segurança**: RLS com `is_workspace_member(workspace_id)` em todas as novas tabelas; escrita limitada ao próprio `criado_por` (ou administrador do workspace); `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` + `GRANT ALL ... TO service_role` na mesma migração; bucket privado `inbox-audio` com URLs assinadas.

## 6. Interface (UX)

- **Botão**: FAB fixo (🎙️/✨ "Nova captura") no `AppLayout` + entrada no header e atalho `Ctrl/Cmd + Shift + I`.
- **Dialog de captura** com três abas: **Falar** | **Escrever** | **Colar**. A aba "Colar" reconhece automaticamente conteúdo grande na área de transferência.
- **Passo de revisão** (mesmo para as três origens): conteúdo bruto à esquerda; à direita o Rascunho Inteligente com Tipo (chips), Título, Descrição, Categoria, Projeto/Empresa/Lead (selects já preenchidos pelo contexto), Prioridade (`PriorityBadge`), Prazo e Próximas ações (checkbox → itens de checklist).
- **Ações**: `Converter em tarefa` · `Salvar como nota` · `Criar lembrete` · `Manter na Inbox` · `Descartar`.
- **Rota `/inbox`**: DataTable + Kanban por status (Pendente → Sugerido → Aprovado → Descartado), filtros por origem/tipo/prioridade/idade, ações em lote e badge de pendências no menu lateral.
- **Ideia → tarefa**: um clique cria a tarefa na Central com checklist das próximas ações; a Inbox guarda o link para a entidade criada.

## 7. Inteligência Artificial

- **Provedor**: Lovable AI Gateway, sempre server-side.
- **Transcrição**: `openai/gpt-4o-mini-transcribe` via `/v1/audio/transcriptions` (multipart, WAV completo), com SSE para exibir o texto durante a fala.
- **Classificação**: `google/gemini-3.6-flash` com **structured output** (schema Zod enxuto, sem bounds no schema — limites no prompt e clamp no código), prompt de sistema em PT-BR com o contexto de memória da seção 4 e chamada protegida contra falha de schema (fallback para o texto bruto).
- **Confiança**: abaixo do limiar, o item permanece como rascunho exigindo revisão manual e a UI destaca "IA incerta".
- **Falha**: item salvo com `status='erro'` mantendo o conteúdo — nenhuma captura é perdida.

## 8. Resumo IA Diário (ajuste 4 — planejado)

- **Escopo**: a IA analisa rascunhos recentes da Inbox, tarefas pendentes/atrasadas, follow-ups vencidos e compromissos do dia (`central-aggregator.ts` já agrega parte disso) e gera um resumo estratégico.
- **Saída estruturada**: `foco_do_dia` (3 itens), `riscos` (atrasos e follow-ups vencidos), `rascunhos_para_decidir`, `sugestao_de_ordem`, texto curto em PT-BR.
- **Onde aparece**: card no topo de "Minha Central" e na rota `/ia`, com botão "Gerar resumo de hoje" (sob demanda no início; agendamento diário depois via rota `/api/public/*` protegida por assinatura + pg_cron).
- **Persistência**: `ai_daily_digests`, um por usuário/dia — evita custo repetido e permite histórico.
- **Custo**: 1 chamada de texto por usuário/dia, com limite configurável por workspace.

## 9. Segurança e custos

- **Banco**: volume baixo; índices em `(workspace_id, status, created_at)` e `(workspace_id, criado_por)`. Áudios com retenção (ex.: 30 dias), mantendo a transcrição.
- **Custos**: STT por duração; classificação com prompt curto (contexto compacto, ~1–3k tokens); resumo diário 1×/dia. Ordem de fração de centavo por captura. Capturas por texto/colagem não geram custo de STT.
- **Controle de usuários**: toda chamada passa por server function autenticada (`requireSupabaseAuth`); `workspace_id` resolvido no servidor; RLS impede acesso cruzado.
- **Limites de uso**: teto diário de capturas e de minutos de áudio por usuário, verificado em `ai_processing_logs` antes de chamar o provedor; duração máxima por gravação (3 min); erros 429/402 do gateway exibidos com mensagem clara; painel de consumo no `/super-admin`.

## 10. Roadmap

**Etapa 1 — MVP**
- Migração: `inbox_ai`, `ai_processing_logs`, enums `inbox_tipo`/`inbox_origem`/`inbox_status`, valor `inbox_ia` em `task_origem`, bucket `inbox-audio`, RLS + GRANTs.
- Módulo `src/modules/inbox-ai/` (tipos, serviços, hooks).
- Server functions: transcrever, montar contexto do workspace, classificar, converter rascunho.
- FAB + dialog com as três abas (voz, texto, colar) + passo de revisão.
- Rota `/inbox` (lista) e conversão em tarefa da Central.

**Etapa 2 — Melhorias**
- Kanban da Inbox, categorias por workspace, ações em lote, envelhecimento de rascunhos.
- Vínculo com empresa/lead + registro na timeline.
- Cache do contexto de IA, painel de consumo no Super Admin, retenção de áudios.

**Etapa 3 — Avançado**
- **Resumo IA Diário** (seção 8) com agendamento automático.
- Aprendizado com o campo `correcoes` (few-shot do histórico aprovado).
- Tipo "Projeto" gerando estrutura completa quando o módulo Projetos existir.
- Captura via WhatsApp/e-mail direto na Inbox e ditado contínuo em tempo real.

Aprovando este plano, começo pela Etapa 1 na ordem acima.
