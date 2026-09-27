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
