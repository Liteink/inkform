'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { shortId } from '@/lib/forward';

export async function createForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim().slice(0, 80);
  const webhook = String(formData.get('webhook_url') || '').trim().slice(0, 500);
  const redirect = String(formData.get('redirect_url') || '').trim().slice(0, 500);
  const turnstile = formData.get('turnstile') === 'on' ? 1 : 0;
  if (!name) return;

  // id collision guard
  let id = shortId();
  for (let i = 0; i < 3; i++) {
    const exists = await db().prepare('SELECT id FROM forms WHERE id = ?').bind(id).first();
    if (!exists) break;
    id = shortId();
  }
  await db()
    .prepare('INSERT INTO forms (id, name, webhook_url, redirect_url, turnstile) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, webhook || null, redirect || null, turnstile)
    .run();
  revalidatePath('/admin');
}

export async function toggleForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  await db()
    .prepare('UPDATE forms SET active = 1 - active WHERE id = ?')
    .bind(id)
    .run();
  revalidatePath('/admin');
  revalidatePath(`/admin/forms/${id}`);
}

export async function deleteForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  await db().prepare('DELETE FROM submissions WHERE form_id = ?').bind(id).run();
  await db().prepare('DELETE FROM forms WHERE id = ?').bind(id).run();
  revalidatePath('/admin');
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
  revalidatePath(`/admin/forms/${id}`);
}

export async function deleteSubmission(formData: FormData) {
  const id = Number(formData.get('id') || 0);
  const formId = String(formData.get('form_id') || '');
  if (!id) return;
  await db().prepare('DELETE FROM submissions WHERE id = ?').bind(id).run();
  revalidatePath(`/admin/forms/${formId}`);
}
