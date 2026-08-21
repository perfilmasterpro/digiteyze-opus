# Plano de Correção e Validação da Integração ZapZap → Growth OS

A auditoria técnica identificou que a integração atual está funcional, mas não atende aos requisitos de nomenclatura, segurança (bypass RLS) e persistência total exigidos para a Fase 3. Este plano visa corrigir essas deficiências para obter o status **APROVADA**.

## Mudanças Técnicas

### 1. Refatoração do Banco de Dados
- Criar migração para renomear `webhook_logs` para `zapzap_webhook_events` (ou criar a nova e migrar dados).
- Adicionar colunas faltantes:
  - `sender_phone`: Telefone do remetente (já existe como `contact_phone`, manteremos consistência).
  - `receiver_phone`: Número da instância que recebeu a mensagem.
  - `chat_id`: ID da conversa/grupo.
  - `message_id`: ID único da mensagem (mapeado para `external_id`).
- Adicionar restrição `UNIQUE` em `(provider, external_id, workspace_id)` para evitar duplicatas reais no banco.
- Ajustar RLS para permitir `INSERT` apenas via `service_role`.

### 2. Atualização dos Serviços e Tipos
- Atualizar `webhook.types.ts` com a nova estrutura.
- Refatorar `webhook.service.ts` para apontar para a nova tabela.
- Implementar extração de dados mais robusta para os novos campos.

### 3. Ajuste do Endpoint (Segurança e Persistência)
- Alterar `src/routes/api/webhooks/zapzap.ts` para importar e usar o `supabaseAdmin` (bypass RLS).
- Garantir que erros de banco de dados sejam logados no servidor, mas o endpoint retorne `200` para o ZapZap após aceitar o payload.
- Adicionar validação de `workspace_id` verificando se ele existe na tabela `workspaces`.

### 4. Interface Administrativa
- Atualizar `WebhookLogsList` e a rota `super-admin.webhooks.tsx` para refletir os novos nomes de tabela e colunas.
- Melhorar a exibição dos novos campos na lista (ex: Telefone Destino, Chat ID).

## Checklist de Validação
- [ ] Tabela `zapzap_webhook_events` criada e com RLS.
- [ ] Endpoint aceitando payloads e persistindo via `supabaseAdmin`.
- [ ] Proteção contra duplicidade via `UNIQUE constraint`.
- [ ] Visualização administrativa atualizada.
- [ ] Teste final com `curl` resultando em persistência real no banco.

---
**Nota:** Esta intervenção foca exclusivamente na Fase 3 (Recebimento e Registro), sem implementar automações ou IA, conforme as restrições do projeto.
