import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface FormRow {
  id: string;
  name: string;
  active: number;
  turnstile: number;
  webhook_url: string | null;
  redirect_url: string | null;
  created_at: string;
}

export interface SubmissionRow {
  id: number;
  form_id: string;
  data: string;
  meta: string;
  spam: number;
  created_at: string;
}

export function db(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as { DB: D1Database }).DB;
}

export function kv(): KVNamespace {
  const { env } = getCloudflareContext();
  return (env as unknown as { RATE_LIMIT: KVNamespace }).RATE_LIMIT;
}

export function envVars() {
  const { env } = getCloudflareContext();
  return env as unknown as {
    ADMIN_PASSWORD?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
    TURNSTILE_SECRET?: string;
  };
}
