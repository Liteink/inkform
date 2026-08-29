import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface ProjectRow {
  id: string;
  name: string;
  created_at: string;
}

export interface FormRow {
  id: string;
  name: string;
  project_id: string | null;
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

/** Idempotent schema bootstrap — makes upgrades work with a plain `wrangler deploy`. */
let schemaReady = false;
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const d = db();
  await d
    .batch([
      d.prepare(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
      d.prepare(`CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, project_id TEXT,
        active INTEGER NOT NULL DEFAULT 1, turnstile INTEGER NOT NULL DEFAULT 0,
        webhook_url TEXT, redirect_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
      d.prepare(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, form_id TEXT NOT NULL,
        data TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}',
        spam INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')))`),
      d.prepare(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL)`),
      d.prepare(`CREATE INDEX IF NOT EXISTS idx_forms_project ON forms(project_id)`),
      d.prepare(`CREATE INDEX IF NOT EXISTS idx_submissions_form ON submissions(form_id, id DESC)`),
    ])
    .catch(() => undefined);
  // column added in 2026-08 migration; fails harmlessly if it already exists
  await d
    .prepare('ALTER TABLE forms ADD COLUMN project_id TEXT')
    .run()
    .catch(() => undefined);
  schemaReady = true;
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
