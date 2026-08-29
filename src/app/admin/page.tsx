import { db, type FormRow } from '@/lib/db';
import { createForm, toggleForm } from './actions';

export const dynamic = 'force-dynamic';

interface FormWithCount extends FormRow {
  total: number;
  today: number;
}

export default async function AdminHome() {
  const r = await db()
    .prepare(
      `SELECT f.*,
        (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id) AS total,
        (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id AND s.created_at >= date('now')) AS today
       FROM forms f ORDER BY f.created_at DESC`
    )
    .all<FormWithCount>();
  const forms: FormWithCount[] = r.results ?? [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Forms</h1>
          <p className="sub">Point any HTML form at an endpoint below. No JS required.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Create a form</h2>
        </div>
        <div className="card-body">
          <form action={createForm}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" name="name" placeholder="Contact form" required />
              </div>
              <div className="field">
                <label htmlFor="redirect_url">Redirect URL <span className="muted">(optional)</span></label>
                <input type="url" id="redirect_url" name="redirect_url" placeholder="https://yoursite.com/thanks" />
              </div>
              <div className="field wide">
                <label htmlFor="webhook_url">Webhook URL <span className="muted">(optional — POST JSON on every submission)</span></label>
                <input type="url" id="webhook_url" name="webhook_url" placeholder="https://yoursite.com/api/hook" />
              </div>
              <div className="field wide">
                <label>
                  <input type="checkbox" name="turnstile" style={{ marginRight: 8 }} />
                  Require Cloudflare Turnstile <span className="muted">(needs TURNSTILE_SECRET set)</span>
                </label>
              </div>
            </div>
            <br />
            <button className="btn btn-primary" type="submit">Create form</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Your forms</h2>
        </div>
        {forms.length === 0 ? (
          <div className="empty">No forms yet — create your first one above.</div>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th>Name</th>
                <th>Endpoint</th>
                <th>Submissions</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id}>
                  <td>
                    <a href={`/admin/forms/${f.id}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>{f.name}</a>
                    <div className="muted" style={{ fontSize: 12 }}>{new Date(f.created_at + 'Z').toLocaleDateString()}</div>
                  </td>
                  <td className="mono">/f/{f.id}</td>
                  <td>
                    {f.total} total
                    {f.today > 0 && <span className="badge badge-brand" style={{ marginLeft: 6 }}>+{f.today} today</span>}
                  </td>
                  <td>
                    {f.active === 1 ? <span className="badge badge-ok">Active</span> : <span className="badge badge-off">Paused</span>}
                  </td>
                  <td>
                    <form action={toggleForm}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className={f.active === 1 ? 'link-plain' : 'link-plain'} type="submit">
                        {f.active === 1 ? 'Pause' : 'Resume'}
                      </button>
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
