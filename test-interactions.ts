import { WebhookService } from './src/modules/webhooks/services/webhook.service';
import { supabaseAdmin } from './src/integrations/supabase.server'; // Correção do import conforme estrutura padrão TanStack/Supabase
import { normalizePhone } from './src/lib/utils';

// Se o import acima falhar, tentar o client.server.ts
async function runTests() {
  let adminClient;
  try {
     const mod = await import('./src/integrations/supabase/client.server');
     adminClient = mod.supabaseAdmin;
  } catch (e) {
     console.error('Falha ao carregar supabaseAdmin');
     process.exit(1);
  }

  console.log('Iniciando Testes 1 a 7 - Validação Funcional (Fase 5 - Prompt 3C)\n');
  
  const results: any[] = [];

  const { data: workspaces } = await adminClient.from('workspaces').select('id').limit(1);
  if (!workspaces || workspaces.length === 0) throw new Error('Nenhum workspace encontrado');
  const workspaceId = workspaces[0].id;

  const testPhone = '5511999990001';
  
  // Limpar leads de teste anteriores
  const { data: existingLeads } = await adminClient.from('leads').select('id, data').eq('workspace_id', workspaceId);
  for (const lead of existingLeads || []) {
      if (normalizePhone((lead.data as any)?.whatsapp) === testPhone) {
          await adminClient.from('leads').delete().eq('id', lead.id);
      }
  }

  const { data: lead } = await adminClient.from('leads').insert({
    workspace_id: workspaceId,
    data: { whatsapp: testPhone, nome: 'Lead Teste' }
  }).select().single();

  if (!lead) throw new Error('Falha ao criar lead de teste');
  const leadId = lead.id;

  console.log(`Workspace: ${workspaceId} | Lead: ${leadId}\n`);

  const checkInteraction = async (msgId: string) => {
    const { data } = await adminClient
      .from('lead_interactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('lead_id', leadId)
      .filter('data->>message_id', 'eq', msgId)
      .maybeSingle();
    return data;
  };

  // --- TESTE 1: INBOUND ---
  const msgId1 = `test_in_${Date.now()}`;
  await WebhookService.logWebhook(workspaceId, 'zapzap', {
    event: 'messages.upsert',
    data: { id: msgId1, from: testPhone, to: '5511000000000', text: 'Oi, teste inbound', messageTimestamp: '1600000001' }
  } as any);
  
  const inter1 = await checkInteraction(msgId1);
  results.push({
    name: '1 — Inbound',
    pass: !!inter1 && (inter1.data as any).direcao === 'incoming' && (inter1.data as any).sender_phone === testPhone,
    evidence: inter1 ? `Interação criada. Direção: ${(inter1.data as any).direcao}` : 'Não criada'
  });

  // --- TESTE 2: OUTBOUND ---
  const msgId2 = `test_out_${Date.now()}`;
  await WebhookService.logWebhook(workspaceId, 'zapzap', {
    event: 'messages.sent', 
    data: { id: msgId2, from: '5511000000000', to: testPhone, text: 'Oi, teste outbound', t: 1600000002 }
  } as any);
  
  const inter2 = await checkInteraction(msgId2);
  results.push({
    name: '2 — Outbound',
    pass: !!inter2 && (inter2.data as any).direcao === 'outgoing' && (inter2.data as any).receiver_phone === testPhone,
    evidence: inter2 ? `Interação criada. Direção: ${(inter2.data as any).direcao}` : 'Não criada'
  });

  // --- TESTE 3: NOT_FOUND ---
  const msgId3 = `test_nf_${Date.now()}`;
  const phoneNF = '5500000000000';
  await WebhookService.logWebhook(workspaceId, 'zapzap', {
    event: 'messages.upsert',
    data: { id: msgId3, from: phoneNF, text: 'Teste Not Found' }
  } as any);
  
  const { data: inter3 } = await adminClient.from('lead_interactions').select('*').filter('data->>message_id', 'eq', msgId3);
  results.push({
    name: '3 — Not Found',
    pass: !inter3 || inter3.length === 0,
    evidence: (!inter3 || inter3.length === 0) ? 'Nenhuma interação criada' : 'ERRO: Interação criada'
  });

  // --- TESTE 4: AMBIGUOUS ---
  const phoneAmb = '5511888880000';
  // Limpar antes
  const { data: ambLeads } = await adminClient.from('leads').select('id, data').eq('workspace_id', workspaceId);
  for (const l of ambLeads || []) {
      if (normalizePhone((l.data as any)?.whatsapp) === phoneAmb) {
          await adminClient.from('leads').delete().eq('id', l.id);
      }
  }
  await adminClient.from('leads').insert([
    { workspace_id: workspaceId, data: { whatsapp: phoneAmb, nome: 'Lead A' } },
    { workspace_id: workspaceId, data: { whatsapp: phoneAmb, nome: 'Lead B' } }
  ]);
  const msgId4 = `test_amb_${Date.now()}`;
  await WebhookService.logWebhook(workspaceId, 'zapzap', {
    event: 'messages.upsert',
    data: { id: msgId4, from: phoneAmb, text: 'Teste Ambiguidade' }
  } as any);
  
  const { data: inter4 } = await adminClient.from('lead_interactions').select('*').filter('data->>message_id', 'eq', msgId4);
  results.push({
    name: '4 — Ambiguous',
    pass: !inter4 || inter4.length === 0,
    evidence: (!inter4 || inter4.length === 0) ? 'Nenhuma interação criada (Ambiguidade respeitada)' : 'ERRO: Interação criada'
  });

  // --- TESTE 5: MATCHED SEM LEAD_ID ---
  const msgId5 = `test_inv_${Date.now()}`;
  await (WebhookService as any).createInteractionFromEvent({
    workspace_id: workspaceId,
    lead_match_status: 'matched',
    lead_id: null,
    message_id: msgId5,
    payload: { event: 'messages.upsert', data: { text: 'Inconsistente' } }
  });
  
  const { data: inter5 } = await adminClient.from('lead_interactions').select('*').filter('data->>message_id', 'eq', msgId5);
  results.push({
    name: '5 — Matched sem lead_id',
    pass: !inter5 || inter5.length === 0,
    evidence: (!inter5 || inter5.length === 0) ? 'Guarda defensiva funcionou' : 'ERRO: Interação criada sem lead_id'
  });

  // --- TESTE 6: CONTEÚDO ---
  const msgId6 = `test_cont_${Date.now()}`;
  const textTest = 'Texto de teste com caracteres especiais! @#$';
  await WebhookService.logWebhook(workspaceId, 'zapzap', {
    event: 'messages.upsert',
    data: { id: msgId6, from: testPhone, text: textTest }
  } as any);
  
  const inter6 = await checkInteraction(msgId6);
  results.push({
    name: '6 — Conteúdo',
    pass: !!inter6 && (inter6.data as any).mensagem === textTest,
    evidence: inter6 ? `Conteúdo preservado: ${(inter6.data as any).mensagem}` : 'Não criada'
  });

  // --- TESTE 7: TIMESTAMP ---
  const msgId7 = `test_ts_${Date.now()}`;
  const tsVal = '1724246000';
  await WebhookService.logWebhook(workspaceId, 'zapzap', {
    event: 'messages.upsert',
    data: { id: msgId7, from: testPhone, messageTimestamp: tsVal }
  } as any);
  
  const inter7 = await checkInteraction(msgId7);
  results.push({
    name: '7 — Timestamp',
    pass: !!inter7 && (inter7.data as any).timestamp_whatsapp === tsVal,
    evidence: inter7 ? `TS Original: ${tsVal} | TS Gravado: ${(inter7.data as any).timestamp_whatsapp}` : 'Não criada'
  });

  // Relatório Final
  console.log('\n| Teste | Resultado | Evidência |');
  console.log('|---|---|---|');
  results.forEach(r => {
    console.log(`| ${r.name} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.evidence} |`);
  });

  // Cleanup final
  await adminClient.from('leads').delete().eq('id', leadId);
  const { data: ambLeadsFinal } = await adminClient.from('leads').select('id, data').eq('workspace_id', workspaceId);
  for (const l of ambLeadsFinal || []) {
      if (normalizePhone((l.data as any)?.whatsapp) === phoneAmb) {
          await adminClient.from('leads').delete().eq('id', l.id);
      }
  }
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
