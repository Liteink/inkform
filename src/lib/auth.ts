import { cookies } from 'next/headers';
import { db, envVars } from './db';

const COOKIE = 'inkform_sess';
const TTL_DAYS = 30;

function sha256(s: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then((b) =>
    [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
  );
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function adminPasswordConfigured(): boolean {
  const p = envVars().ADMIN_PASSWORD;
  return !!p && p !== 'changeme' && p.length > 0;
}

export async function login(password: string): Promise<boolean> {
  if (!adminPasswordConfigured()) return false;
  const expected = envVars().ADMIN_PASSWORD!;
  const a = new TextEncoder().encode(password);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return false;

  const raw = randomToken();
  const hash = await sha256(raw);
  const expires = new Date(Date.now() + TTL_DAYS * 86400_000).toISOString();
  await db().prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)').bind(hash, expires).run();

  const jar = await cookies();
  jar.set(COOKIE, raw, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_DAYS * 86400,
  });
  return true;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) {
    const hash = await sha256(raw);
    await db().prepare('DELETE FROM sessions WHERE token = ?').bind(hash).run();
  }
  jar.delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;
  const hash = await sha256(raw);
  const row = await db()
    .prepare("SELECT token FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(hash)
    .first();
  return !!row;
}
