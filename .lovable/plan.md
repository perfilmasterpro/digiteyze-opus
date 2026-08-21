# Plano de Implementação — Fase 5: Persistência no Supabase e Idempotência

Este plano detalha a migração da persistência de interações e eventos do Lead do `localStorage` para o Supabase, garantindo a idempotência de mensagens do WhatsApp.

## 1. Banco de Dados — Idempotência
Criar um índice único parcial na tabela `lead_interactions` para evitar duplicidade de mensagens de WhatsApp.
- **Coluna**: `workspace_id` + `(data->>'message_id')`.
- **Condição**: Apenas onde `data->>'tipo' = 'whatsapp'`.
- **Validação prévia**: Já realizada (0 conflitos encontrados).

## 2. Atualização de Tipagem
Refatorar `src/modules/prospeccao/types/entities.types.ts` para alinhar com a estrutura JSONB do banco.
- Definir `LeadInteractionType` (estendendo os existentes).
- Criar `LeadInteractionPayload` para tipar o conteúdo do campo `data`.
- Ajustar `LeadInteraction` para usar o novo payload.
- Manter compatibilidade com eventos sistêmicos em `LeadEvent`.

## 3. Refatoração de Serviços
### `lead-interactions.service.ts`
- Migrar `listLeadInteractions` para consulta no Supabase filtrando por `workspace_id` e `lead_id`.
- Migrar `createLeadInteraction` para `upsert` ou `insert` com tratamento de conflito.
- Implementar fallback de leitura do `localStorage` (unificando com os dados da nuvem se necessário, sem gravar duplicado).
- Remover `writeAll` e funções que alteram o `localStorage` para novas interações.

### `lead-events.service.ts`
- Migrar `listLeadEvents` para consulta no Supabase.
- Migrar `recordLeadEvent` para inserção no Supabase.
- Manter separação rigorosa: eventos sistêmicos ≠ interações.

## 4. Segurança e RLS
- Validar as políticas existentes de `lead_interactions` e `lead_events`.
- Garantir que `workspace_id` seja sempre injetado nas operações de escrita para respeitar o isolamento.

## 5. Testes e Validação
- Testar criação manual de interação (Nota).
- Testar simulação de entrada de WhatsApp (com e sem `message_id`).
- Validar ordem cronológica e isolamento de workspace.

## Aspectos Técnicos
- Utilizar `supabase` (client) para operações autenticadas.
- Mapear corretamente o campo `data` (JSONB) do banco para o campo correspondente no TypeScript para evitar colisões de nome.
