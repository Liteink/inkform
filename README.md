# InkForm

[中文文档](./README.zh.md)

<span><img src="https://img.shields.io/badge/license-MIT-orange" alt="MIT"> <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020" alt="Cloudflare Workers"></span>

**Open-source form backend for static sites. Runs entirely on Cloudflare's free tier.**

Point any HTML form at InkForm and get a working backend: submissions land in a dashboard, optional webhooks and Telegram notifications fire instantly. No server, no database admin, no monthly bill.

```html
<form action="https://your-inkform.workers.dev/f/your-form-id" method="POST">
  <input type="text" name="email" required />
  <textarea name="message"></textarea>
  <button>Send</button>
</form>
```

That's the whole integration. No JavaScript required.

## Why

- **Formspree-style DX** — plain HTML `action`, works without JS, AJAX supported
- **Your data, your database** — every submission lands in your own D1, not a vendor's
- **Free tier forever** — Workers + D1 + KV free tiers cover thousands of submissions/month
- **Spam-safe by default** — honeypot field, per-IP rate limiting, optional Cloudflare Turnstile
- **Notifications** — webhook (JSON POST) and/or Telegram on every submission

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Liteink/inkform)

> Requires a free [Cloudflare account](https://dash.cloudflare.com/sign-up). The button clones this repo into your account, creates the Worker, D1 database and KV namespace, and deploys.

### Manual deploy

```bash
git clone https://github.com/Liteink/inkform.git
cd inkform
npm install

# create resources
npx wrangler d1 create inkform
npx wrangler kv namespace create RATE_LIMIT

# paste the returned IDs into wrangler.jsonc (see wrangler.example.jsonc),
# then initialize the database:
npx wrangler d1 execute inkform --remote --file=schema.sql

# set your admin password (never keep "changeme")
npx wrangler secret put ADMIN_PASSWORD

# optional: Telegram notifications
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID

# optional: per-form Turnstile
npx wrangler secret put TURNSTILE_SECRET

npm run deploy
```

Open `https://<your-worker>.workers.dev/admin`, sign in, create your first form, copy the endpoint.

## Usage

### Plain HTML

```html
<form action="https://your-worker.workers.dev/f/FORM_ID" method="POST">
  <input type="email" name="email" required />
  <textarea name="message"></textarea>

  <!-- honeypot: hidden from humans, bots fill it and get silently dropped -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />

  <button>Send</button>
</form>
```

After submit, visitors are redirected back to the referring page (`?submitted=1` appended). Set a default redirect per form in the dashboard, or override per submission with a `_next` field.

### AJAX / fetch

```js
const res = await fetch('https://your-worker.workers.dev/f/FORM_ID', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ email: 'hi@example.com', message: 'hello' }),
});
const json = await res.json(); // { ok: true } or { ok: false, error: "..." }
```

### Special fields

Fields starting with `_` are control fields — they are never stored.

| Field | Effect |
| --- | --- |
| `_gotcha` | Honeypot. Any non-empty value → submission silently dropped (bot gets a fake success). |
| `_next` | Full URL to redirect to after a full-page submit. Overrides the form's default redirect. |
| `cf-turnstile-response` | Turnstile token, validated when Turnstile is enabled for the form. |

### Spam protection

1. **Honeypot** — add the hidden `_gotcha` field, done.
2. **Rate limit** — 5 submissions per IP per form per hour (KV-backed).
3. **Turnstile** (optional) — create a Turnstile widget on your domain, enable it per form in the dashboard, set `TURNSTILE_SECRET`. Embed the Turnstile widget on your page and the token is verified server-side.

### Notifications

- **Webhook** — set per form. Every submission POSTs `{ form, form_id, data, meta }` as JSON.
- **Telegram** — set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (global). Every submission sends a formatted message.

## Architecture

- [Next.js 15](https://nextjs.org) (App Router) + [@opennextjs/cloudflare](https://opennext.js.org/cloudflare)
- **D1** — forms, submissions, sessions
- **KV** — rate limiting
- Single Worker deployment, ~zero cost at hobby scale

## Roadmap

- [ ] Email forwarding (Resend)
- [ ] File uploads (R2)
- [ ] Submission auto-export (scheduled cleanup)
- [ ] Multiple admin accounts

## License

MIT © [LiteInk](https://liteink.co)

Part of the LiteInk family — [Astro templates](https://liteink.co) · [Ink CMS](https://github.com/Liteink/ink-cms) · [InkForm](https://github.com/Liteink/inkform)
