# Recuperação do estado que roda no Vercel

Esta branch = `main` (c8c3f6f) + reconstrução das correções que rodavam em produção
mas estavam UNCOMMITTED e se perderam. Reconstruído a partir das auditorias de código.
`tsc --noEmit` = 0 erros.

## Correções incluídas (7)
1. Busca de leads null-safe (prospeccao.index/lista) — não derruba mais a tela.
2. Telefone: DDI por comprimento (corrige DDD 55/RS) — zapzap-api.server.ts.
3. Claim atômico no runner (não duplica envio em concorrência) — cadence-runner.server.ts.
4. Guarda otimista no avançar/concluir manual — lead-cadences.service.ts.
5. Botão "Avançar" só com cadência ativa — lead-cadence-block.tsx.
6. Variável de template ausente vira vazio (não vaza {{token}}) — apply-variables.ts.
7. Webhook exige secret se ZAPZAP_WEBHOOK_SECRET setado + zapzap-flow valida membership.
8. Tipos em leads.service.ts (tsc 0).

## GAP CONHECIDO — camada de config do ZapZap NÃO está aqui
A tela Configurações→Integrações, o QR connect, as rotas /api/integracoes/* e o
getZapZapConfig (com fallback fromEnv) também eram trabalho uncommitted perdido — não
estão em NENHUMA branch do GitHub, só no build compilado do Vercel. O app FUNCIONA sem
eles (envia usando as env ZAPZAP_API_KEY/SECRET/INSTANCE_ID), mas a tela de configurar
credenciais/QR dentro do app não existe neste código. Precisa ser recriada se quiser
paridade total com o que está no ar.

## Camada de config do ZapZap (reconstruída)
Recriada a tela Configurações→Integrações + QR + rotas + serviços de config. tsc = 0.
Arquivos novos: src/modules/integrations/* (services + card), src/routes/api/integracoes/* (config, qr),
supabase/migrations/20260924000000_zapzap_config.sql. Editados: configuracoes.tsx (renderiza o card),
supabase/types.ts, routeTree.gen.ts.

### ⚠️ VALIDAR AO VIVO antes de merge no main (é reconstrução, o source original se perdeu)
1. APLICAR a migration `20260924000000_zapzap_config.sql` no Supabase (cria tabela zapzap_config).
   Sem ela: getZapZapConfig cai em env (não quebra), mas SALVAR config dá erro de tabela inexistente.
   Se o build original guardava a config em `workspace_settings` (JSONB) em vez de tabela nova,
   ajustar o storage (comportamento externo é o mesmo).
2. RLS da tabela = só service_role (escolha por segurança). Conferir que nenhuma tela lê pelo client anon.
3. webhook_secret existe no server/merge mas o card não tem input dele (fora do escopo do card).
   Setar o webhook da instância no ZapZap ao salvar (M4) segue manual.
4. Formato do QR: assumido `instance.qrcode` (base64/data:) — validar gerando um QR real.
5. Path do QR `/api/v1/instances/{id}/qrcode` — confirmado no backend real; checar se vier 404.

## Agendamento de follow-ups (LIGADO no código — só faltam 2 envs)
O agendador de cadências não disparava (não havia gatilho). Agora está wired:
- Rota `src/routes/api/public/cron/cadences-runner.ts` ganhou handler **GET** (além do POST).
- `vercel.json` com Vercel Cron chamando essa rota **1x/dia às 12:00 UTC (9h BRT)**.
  (Plano Hobby permite cron diário; cadências são por DIA, então funciona. Para follow-ups
  mais frequentes, subir para Pro e trocar o schedule, ou usar pg_cron no Supabase.)

### Pra ligar (Denize), setar 2 envs na Vercel e redeployar:
1. `CRON_SECRET` = um segredo forte qualquer (o Vercel injeta ele no Bearer do cron).
2. `SUPABASE_SERVICE_ROLE_KEY` = a service_role do Supabase dela (o runner precisa dela).
   (Também: `ZAPZAP_API_KEY/SECRET/INSTANCE_ID` OU configurar pela tela de Integrações.)
Sem CRON_SECRET a rota responde 503 (não roda). Com as 2 setadas, o follow-up passa a rodar sozinho.

### Alternativa mais frequente (pg_cron no Supabase, opcional):
```sql
select cron.schedule('cadences-runner','*/15 * * * *', $$
  select net.http_post(
    url:='https://<DOMINIO-VERCEL>/api/public/cron/cadences-runner',
    headers:=jsonb_build_object('Authorization','Bearer <CRON_SECRET>')
  );
$$);
```

### Ajuste de robustez (M2 do audit): o runner processa até 50 envios por execução.
Se estourar o timeout da função Vercel, reduzir o batch ou setar maxDuration em vercel.json.
