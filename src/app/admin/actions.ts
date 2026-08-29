'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { shortId } from '@/lib/forward';

function refresh(formId?: string) {
  revalidatePath('/admin', 'layout');
  if (formId) revalidatePath(`/admin/forms/${formId}`);
}

async function freshId(table: 'projects' | 'forms'): Promise<string> {
  let id = shortId();
  for (let i = 0; i < 3; i++) {
    const exists = await db().prepare(`SELECT id FROM ${table} WHERE id = ?`).bind(id).first();
    if (!exists) break;
    id = shortId();
  }
  return id;
}

/* ---------- Projects ---------- */

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') || '').trim().slice(0, 80);
  if (!name) return;
  const id = await freshId('projects');
  await db().prepare('INSERT INTO projects (id, name) VALUES (?, ?)').bind(id, name).run();
  refresh();
}

export async function renameProject(formData: FormData) {
  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim().slice(0, 80);
  if (!id || !name) return;
  await db().prepare('UPDATE projects SET name = ? WHERE id = ?').bind(name, id).run();
  refresh();
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id || id === 'general') return;
  const forms = await db().prepare('SELECT id FROM forms WHERE project_id = ?').bind(id).all<{ id: string }>();
  for (const f of forms.results ?? []) {
    await db().prepare('DELETE FROM submissions WHERE form_id = ?').bind(f.id).run();
  }
  await db().prepare('DELETE FROM forms WHERE project_id = ?').bind(id).run();
  await db().prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  refresh();
}

/* ---------- Forms ---------- */

export async function createForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim().slice(0, 80);
  const project = String(formData.get('project_id') || '').trim() || null;
  const webhook = String(formData.get('webhook_url') || '').trim().slice(0, 500);
  const redirect = String(formData.get('redirect_url') || '').trim().slice(0, 500);
  const turnstile = formData.get('turnstile') === 'on' ? 1 : 0;
  if (!name) return;

  const id = await freshId('forms');
  await db()
    .prepare('INSERT INTO forms (id, name, project_id, webhook_url, redirect_url, turnstile) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, name, project, webhook || null, redirect || null, turnstile)
    .run();
  refresh(id);
}

export async function toggleForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  await db()
    .prepare('UPDATE forms SET active = 1 - active WHERE id = ?')
    .bind(id)
    .run();
  refresh(id);
}

export async function deleteForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) return;
  await db().prepare('DELETE FROM submissions WHERE form_id = ?').bind(id).run();
  await db().prepare('DELETE FROM forms WHERE id = ?').bind(id).run();
  refresh(id);
}

export async function updateForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim().slice(0, 80);
  const webhook = String(formData.get('webhook_url') || '').trim().slice(0, 500);
  const redirect = String(formData.get('redirect_url') || '').trim().slice(0, 500);
  const turnstile = formData.get('turnstile') === 'on' ? 1 : 0;
  await db()
    .prepare('UPDATE forms SET name = ?, webhook_url = ?, redirect_url = ?, turnstile = ? WHERE id = ?')
    .bind(name, webhook || null, redirect || null, turnstile, id)
    .run();
  refresh(id);
}

/* ---------- Submissions ---------- */

export async function deleteSubmission(formData: FormData) {
  const id = Number(formData.get('id') || 0);
  const formId = String(formData.get('form_id') || '');
  if (!id) return;
  await db().prepare('DELETE FROM submissions WHERE id = ?').bind(id).run();
  refresh(formId);
}
