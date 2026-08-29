import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { db, type FormRow, type SubmissionRow } from '@/lib/db';
import { deleteForm, deleteSubmission, toggleForm, updateForm } from '../../actions';
import CopyEndpoint from './CopyEndpoint';

export const dynamic = 'force-dynamic';

interface ParsedSub extends SubmissionRow {
  parsed: Record<string, string>;
  metaParsed: Record<string, unknown>;
}

const TABS = ['overview', 'submissions', 'settings'] as const;
type Tab = (typeof TABS)[number];

export default async function FormDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'overview';

  const form = await db().prepare('SELECT * FROM forms WHERE id = ?').bind(id).first<FormRow>();
  if (!form) notFound();

  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost';
  const proto = h.get('x-forwarded-proto') || 'https';
  const endpoint = `${proto}://${host}/f/${form.id}`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{form.name}</h1>
          <p className="sub">
            {form.active === 1 ? 'Active' : 'Paused'} · Created {new Date(form.created_at + 'Z').toLocaleDateString()}
          </p>
        </div>
        <div className="actions-row">
          <a className="btn btn-soft btn-sm" href={`/admin/forms/${form.id}/csv`}>Export CSV</a>
          {tab === 'settings' && (
            <form action={deleteForm}>
              <input type="hidden" name="id" value={form.id} />
              <button className="btn btn-sm btn-danger-soft" type="submit">Delete form</button>
            </form>
          )}
        </div>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <a key={t} href={`/admin/forms/${form.id}?tab=${t}`} className={`tab ${tab === t ? 'active' : ''}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </a>
        ))}
      </nav>

      {tab === 'overview' && <Overview formId={form.id} endpoint={endpoint} formName={form.name} />}
      {tab === 'submissions' && <Submissions formId={form.id} />}
      {tab === 'settings' && <Settings form={form} />}
    </div>
  );
}

/* ---------- Overview ---------- */

async function Overview({ formId, endpoint, formName }: { formId: string; endpoint: string; formName: string }) {
  const stats = await db()
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM submissions WHERE form_id = ?1 AND spam = 0) AS total,
        (SELECT COUNT(*) FROM submissions WHERE form_id = ?1 AND spam = 0 AND created_at >= date('now')) AS today,
        (SELECT COUNT(*) FROM submissions WHERE form_id = ?1 AND spam = 0 AND created_at >= datetime('now', '-7 days')) AS week,
        (SELECT COUNT(*) FROM submissions WHERE form_id = ?1 AND spam = 1) AS spam`
    )
    .bind(formId)
    .first<{ total: number; today: number; week: number; spam: number }>();

  const dayR = await db()
    .prepare(
      `SELECT date(created_at) AS d, COUNT(*) AS c FROM submissions
       WHERE form_id = ?1 AND spam = 0 AND created_at >= date('now', '-6 days')
       GROUP BY d ORDER BY d`
    )
    .bind(formId)
    .all<{ d: string; c: number }>();
  const byDay = new Map((dayR.results ?? []).map((r) => [r.d, r.c]));

  const days: { label: string; c: number; iso: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const iso = dt.toISOString().slice(0, 10);
    days.push({ label: dt.toLocaleDateString(undefined, { weekday: 'short' }), c: byDay.get(iso) ?? 0, iso });
  }
  const max = Math.max(1, ...days.map((d) => d.c));

  const snippet =
    `<form action="${endpoint}" method="POST">\n` +
    `  <input type="text" name="name" placeholder="Name" required>\n` +
    `  <input type="email" name="email" placeholder="Email" required>\n` +
    `  <textarea name="message" placeholder="Message"></textarea>\n` +
    `  <button type="submit">Send</button>\n` +
    `</form>`;

  return (
    <div>
      <div className="endpoint-box">
        <span className="muted">endpoint →</span>
        <span className="url">{endpoint}</span>
        <CopyEndpoint url={endpoint} />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-num">{stats?.total ?? 0}</div>
          <div className="stat-label">Total submissions</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats?.today ?? 0}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats?.week ?? 0}</div>
          <div className="stat-label">Last 7 days</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats?.spam ?? 0}</div>
          <div className="stat-label">Caught as spam</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Last 7 days</h2></div>
        <div className="card-body">
          <div className="bars">
            {days.map((d) => (
              <div key={d.iso} className="bar-col" title={`${d.iso}: ${d.c}`}>
                <div className="bar-val">{d.c > 0 ? d.c : ''}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${Math.round((d.c / max) * 100)}%` }} />
                </div>
                <div className="bar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Integrate — point any HTML form at this endpoint</h2></div>
        <div className="card-body">
          <pre className="code" style={{ margin: 0 }}>{snippet}</pre>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Any fields you include are captured. Special names: <code>_gotcha</code> (honeypot, hides bots)
            and <code>_next</code> (redirect after submit). A JSON webhook fires on every submission if configured in Settings.
          </p>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13 }}>
        “{formName}” receives submissions in real time. View them under the Submissions tab.
      </p>
    </div>
  );
}

/* ---------- Submissions ---------- */

async function Submissions({ formId }: { formId: string }) {
  const subResult = await db()
    .prepare('SELECT * FROM submissions WHERE form_id = ? ORDER BY id DESC LIMIT 100')
    .bind(formId)
    .all<SubmissionRow>();
  const subs: SubmissionRow[] = subResult.results ?? [];

  const parsed: ParsedSub[] = (subs ?? []).map((s: SubmissionRow) => ({
    ...s,
    parsed: JSON.parse(s.data) as Record<string, string>,
    metaParsed: JSON.parse(s.meta || '{}') as Record<string, unknown>,
  }));

  if (parsed.length === 0) {
    return (
      <div className="card">
        <div className="empty">No submissions yet. Send a test POST to the endpoint on the Overview tab.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head"><h2>Submissions <span className="muted">(latest 100)</span></h2></div>
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
            <tr key={s.id} style={s.spam === 1 ? { opacity: 0.55 } : undefined}>
              <td className="mono muted" style={{ fontSize: 12 }}>
                {new Date(s.created_at + 'Z').toLocaleString()}
                {s.spam === 1 && <div><span className="badge badge-spam">spam</span></div>}
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
                  <input type="hidden" name="form_id" value={formId} />
                  <button className="link-plain" type="submit">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Settings ---------- */

function Settings({ form }: { form: FormRow }) {
  return (
    <div>
      <div className="card">
        <div className="card-head">
          <h2>Form settings</h2>
          <form action={toggleForm}>
            <input type="hidden" name="id" value={form.id} />
            <button className={form.active === 1 ? 'btn btn-soft btn-sm' : 'btn btn-primary btn-sm'} type="submit">
              {form.active === 1 ? 'Pause form' : 'Resume form'}
            </button>
          </form>
        </div>
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
        <div className="card-head"><h2>Danger zone</h2></div>
        <div className="card-body">
          <p className="muted" style={{ fontSize: 13.5, marginTop: 0 }}>
            Deleting a form permanently removes it and all of its submissions.
          </p>
          <form action={deleteForm}>
            <input type="hidden" name="id" value={form.id} />
            <button className="btn btn-sm btn-danger-soft" type="submit">Delete this form</button>
          </form>
        </div>
      </div>
    </div>
  );
}
