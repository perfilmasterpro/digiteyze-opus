const ZAPZAP_BASE_URL = 'https://api.zapzapapi.com';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}

export type ZapZapSendTextInput = {
  number: string;
  text: string;
  delay?: number;
  replyid?: string;
  digitando?: boolean;
};

export type ZapZapSendTextResult = {
  messageId: string;
  status: string;
};

/** Server-only client for ZapZap API. Never expose credentials to the browser. */
export async function sendZapZapText(
  input: ZapZapSendTextInput,
): Promise<ZapZapSendTextResult> {
  const apiKey = requiredEnv('ZAPZAP_API_KEY');
  const apiSecret = requiredEnv('ZAPZAP_API_SECRET');
  const instanceId = requiredEnv('ZAPZAP_INSTANCE_ID');

  const number = input.number.replace(/\D/g, '');
  if (!number) throw new Error('Número de WhatsApp inválido.');
  if (!input.text.trim()) throw new Error('Mensagem não pode ser vazia.');

  const response = await fetch(
    `${ZAPZAP_BASE_URL}/api/v1/${encodeURIComponent(instanceId)}/send/text`,
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number,
        text: input.text,
        ...(input.delay !== undefined ? { delay: input.delay } : {}),
        ...(input.replyid ? { replyid: input.replyid } : {}),
        ...(input.digitando !== undefined ? { digitando: input.digitando } : {}),
      }),
      signal: AbortSignal.timeout(55_000),
    },
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`;
    throw new Error(`ZapZap: ${detail}`);
  }

  if (!body?.messageId || !body?.status) {
    throw new Error('ZapZap retornou uma resposta de envio inválida.');
  }

  return { messageId: body.messageId, status: body.status };
}
