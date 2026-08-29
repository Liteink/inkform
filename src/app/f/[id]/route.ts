import { getCloudflareContext } from '@opennextjs/cloudflare';
import { db, ensureSchema, envVars, type FormRow } from '@/lib/db';
import { forward, rateLimited, verifyTurnstile } from '@/lib/forward';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await ensureSchema();
  const ajax =
    (req.headers.get('accept') || '').includes('application/json') ||
    (req.headers.get('x-requested-with') || '') === 'XMLHttpRequest';

  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
    });

  const redirectBack = (req: Request, ok: boolean, fallbackUrl: string, extra = '') => {
    const url = ok ? fallbackUrl : fallbackUrl;
    const sep = url.includes('?') ? '&' : '?';
    return new Response(null, {
      status: 303,
      headers: { Location: url + sep + (ok ? 'submitted=1' : 'error=1') + extra },
    });
  };

  // ---- Parse body (form-encoded / multipart / JSON) ----
  let fields: Record<string, string> = {};
  try {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const parsed = await req.json();
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            fields[k] = String(v);
          }
        }
      }
    } else {
      const fd = await req.formData();
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') fields[k] = v;
      }
    }
  } catch {
    return ajax ? json(400, { ok: false, error: 'unreadable body' }) : new Response('Bad Request', { status: 400 });
  }

  const referer = req.headers.get('referer') || req.headers.get('origin') || '/';
  const redirectTarget = fields._next || '';

  const done = (ok: boolean, status: number, error?: string, form?: FormRow) => {
    if (ajax) return json(ok ? 200 : status, ok ? { ok: true } : { ok: false, error });
    const fallback = redirectTarget || form?.redirect_url || referer || '/';
    return redirectBack(req, ok, fallback);
  };

  // ---- Honeypot: silently accept, never store ----
  if (fields._gotcha && fields._gotcha.trim() !== '') {
    return done(true, 200);
  }

  // ---- Form lookup ----
  const form = await db().prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>();
  if (!form || form.active !== 1) {
    return ajax ? json(404, { ok: false, error: 'form not found' }) : new Response('Not Found', { status: 404 });
  }

  // ---- Rate limit ----
  const ip =
    (req.headers.get('cf-connecting-ip') || '0.0.0.0').trim();
  if (await rateLimited(form.id, ip)) {
    return done(false, 429, 'too many submissions', form);
  }

  // ---- Turnstile (optional per form) ----
  if (form.turnstile === 1) {
    const secret = envVars().TURNSTILE_SECRET;
    const token = fields['cf-turnstile-response'] || '';
    if (!secret) return done(false, 500, 'turnstile not configured', form);
    if (!token || !(await verifyTurnstile(token, ip, secret))) {
      return done(false, 403, 'captcha verification failed', form);
    }
  }

  // ---- Sanitize: underscore-prefixed fields are control fields, never stored ----
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!k.startsWith('_') && k !== 'cf-turnstile-response') data[k] = v.slice(0, 10_000);
  }
  if (Object.keys(data).length === 0) {
    return done(false, 400, 'no fields to store', form);
  }

  const meta = JSON.stringify({
    ip,
    ua: (req.headers.get('user-agent') || '').slice(0, 300),
    lang: req.headers.get('accept-language')?.slice(0, 50) || null,
    referer: referer.slice(0, 300),
  });

  await db()
    .prepare('INSERT INTO submissions (form_id, data, meta) VALUES (?, ?, ?)')
    .bind(form.id, JSON.stringify(data), meta)
    .run();

  // ---- Forward notifications (async, never block response) ----
  try {
    const { ctx: wctx } = getCloudflareContext();
    wctx.waitUntil(forward({ formId: form.id, formName: form.name, data, meta: { ip } }, form.webhook_url));
  } catch {
    await forward({ formId: form.id, formName: form.name, data, meta: { ip } }, form.webhook_url);
  }

  return done(true, 200, undefined, form);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Friendly probe: tells an integrator the form exists (no data leak).
  const { id } = await ctx.params;
  const form = await db().prepare('SELECT id, name, active, turnstile FROM forms WHERE id = ?').bind(id).first();
  if (!form) return new Response(JSON.stringify({ ok: false, error: 'form not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return new Response(
    JSON.stringify({ ok: true, form: { id: form.id, name: form.name, active: form.active === 1, turnstile: form.turnstile === 1, method: 'POST' } }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
