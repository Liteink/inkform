import { db, envVars, kv } from './db';

/** KV rate limit: max N submissions per IP per form per hour. */
export async function rateLimited(formId: string, ip: string, max = 5): Promise<boolean> {
  const key = `rl:${formId}:${ip}`;
  const cur = (await kv().get(key)) ?? '0';
  if (parseInt(cur, 10) >= max) return true;
  await kv().put(key, String(parseInt(cur, 10) + 1), { expirationTtl: 3600 });
  return false;
}

export async function verifyTurnstile(token: string, ip: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const json = (await res.json()) as { success: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

export interface ForwardPayload {
  formId: string;
  formName: string;
  data: Record<string, string>;
  meta: Record<string, unknown>;
}

/** Fire-and-forget forwards: webhook + optional global Telegram. Use via waitUntil. */
export async function forward(payload: ForwardPayload, webhookUrl: string | null): Promise<void> {
  const body = JSON.stringify({
    form: payload.formName,
    form_id: payload.formId,
    data: payload.data,
    meta: payload.meta,
  });

  const tasks: Promise<unknown>[] = [];

  if (webhookUrl && /^https:\/\//.test(webhookUrl)) {
    tasks.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'InkForm/0.1' },
        body,
      }).catch(() => {})
    );
  }

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = envVars();
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const lines = Object.entries(payload.data)
      .slice(0, 20)
      .map(([k, v]) => `<b>${esc(k)}</b>: ${esc(String(v).slice(0, 300))}`);
    const text = `📮 New submission — <b>${esc(payload.formName)}</b>\n\n${lines.join('\n')}`;
    tasks.push(
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }).catch(() => {})
    );
  }

  await Promise.all(tasks);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function shortId(len = 8): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return [...b].map((x) => alphabet[x % alphabet.length]).join('');
}

export function siteOrigin(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-forwarded-proto')?.split(',')[0] + '://' + (h.get('x-forwarded-host') || h.get('host') || '')
  );
}

export { db };
