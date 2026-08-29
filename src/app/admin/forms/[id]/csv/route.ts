import { headers } from 'next/headers';
import { db, type FormRow, type SubmissionRow } from '@/lib/db';
import { isAuthed } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function csvCell(v: string): string {
  return '"' + String(v).replace(/"/g, '""') + '"';
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new Response('Unauthorized', { status: 401 });
  const { id } = await ctx.params;
  const form = await db().prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>();
  if (!form) return new Response('Not Found', { status: 404 });

  const { results } = await db()
    .prepare('SELECT * FROM submissions WHERE form_id = ? ORDER BY id ASC')
    .bind(id)
    .all<SubmissionRow>();

  // Union of all field names across submissions (stable order: first-seen)
  const fieldNames: string[] = ['id', 'created_at'];
  for (const r of results) {
    const data = JSON.parse(r.data) as Record<string, string>;
    for (const k of Object.keys(data)) if (!fieldNames.includes(k)) fieldNames.push(k);
  }

  const rows = [fieldNames.map(csvCell).join(',')];
  for (const r of results) {
    const data = JSON.parse(r.data) as Record<string, string>;
    rows.push(
      fieldNames
        .map((f) => {
          if (f === 'id') return csvCell(String(r.id));
          if (f === 'created_at') return csvCell(r.created_at);
          return csvCell(data[f] ?? '');
        })
        .join(',')
    );
  }

  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost';
  return new Response('\uFEFF' + rows.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inkform-${id}.csv"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
