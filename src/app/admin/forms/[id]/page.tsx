import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db, type FormRow, type SubmissionRow } from '@/lib/db';
import { deleteForm, deleteSubmission, updateForm } from '../../actions';
import CopyEndpoint from './CopyEndpoint';

export const dynamic = 'force-dynamic';

interface ParsedSub extends SubmissionRow {
  parsed: Record<string, string>;
  metaParsed: Record<string, unknown>;
}

export default async function FormDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await db().prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>();
  if (!form) notFound();

  const subResult = await db()
    .prepare('SELECT * FROM submissions WHERE form_id = ? ORDER BY id DESC LIMIT 100')
    .bind(id)
    .all<SubmissionRow>();
  const subs: SubmissionRow[] = subResult.results ?? [];

  const parsed: ParsedSub[] = (subs ?? []).map((s: SubmissionRow) => ({
    ...s,
    parsed: JSON.parse(s.data) as Record<string, string>,
    metaParsed: JSON.parse(s.meta || '{}') as Record<string, unknown>,
  }));

  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost';
  const proto = h.get('x-forwarded-proto') || 'https';
  const endpoint = `${proto}://${host}/f/${form.id}`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{form.name}</h1>
          <p className="sub">Created {new Date(form.created_at + 'Z').toLocaleDateString()} · {subs.length} submission{subs.length === 1 ? '' : 's'}</p>
        </div>
        <div className="actions-row">
          <a className="btn btn-soft btn-sm" href={`/admin/forms/${form.id}/csv`}>Export CSV</a>
          <form action={deleteForm}>
            <input type="hidden" name="id" value={form.id} />
            <button className="btn btn-sm btn-danger-soft" type="submit">Delete form</button>
          </form>
        </div>
      </div>

      <div className="endpoint-box">
        <span className="muted">endpoint →</span>
        <span className="url">{endpoint}</span>
        <CopyEndpoint url={endpoint} />
      </div>

      <div className="card">
        <div className="card-head"><h2>Settings</h2></div>
        <div className="card-body">
          <form action={updateForm}>
            <input type="hidden" name="id" value={form.id} />
            <div className="form-row">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" name="name" defaultValue={form.name} required />
              </div>
              <div className="field">
                <label htmlFor="redirect_url">Redirect URL</label>
                <input type="url" id="redirect_url" name="redirect_url" defaultValue={form.redirect_url || ''} placeholder="https://yoursite.com/thanks" />
              </div>
              <div className="field wide">
                <label htmlFor="webhook_url">Webhook URL</label>
                <input type="url" id="webhook_url" name="webhook_url" defaultValue={form.webhook_url || ''} placeholder="https://yoursite.com/api/hook" />
              </div>
              <div className="field wide">
                <label>
                  <input type="checkbox" name="turnstile" defaultChecked={form.turnstile === 1} style={{ marginRight: 8 }} />
                  Require Cloudflare Turnstile <span className="muted">(needs TURNSTILE_SECRET set)</span>
                </label>
              </div>
            </div>
            <br />
            <button className="btn btn-primary btn-sm" type="submit">Save settings</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Submissions <span className="muted">(latest 100)</span></h2></div>
        {parsed.length === 0 ? (
          <div className="empty">No submissions yet. Send a test POST to the endpoint above.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th style={{ width: 130 }}>Time</th>
                <th>Fields</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {parsed.map((s) => (
                <tr key={s.id}>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {new Date(s.created_at + 'Z').toLocaleString()}
                  </td>
                  <td>
                    {Object.entries(s.parsed).map(([k, v]) => (
                      <div key={k} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <strong style={{ fontSize: 12.5 }}>{k}</strong>
                        <span className="muted">: {String(v).slice(0, 160)}{String(v).length > 160 ? '…' : ''}</span>
                      </div>
                    ))}
                    <details>
                      <summary className="muted" style={{ fontSize: 12, cursor: 'pointer', marginTop: 4 }}>Raw</summary>
                      <div className="sub-detail">{JSON.stringify({ data: s.parsed, meta: s.metaParsed }, null, 2)}</div>
                    </details>
                  </td>
                  <td>
                    <form action={deleteSubmission}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="form_id" value={form.id} />
                      <button className="link-plain" type="submit">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
