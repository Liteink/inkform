import { redirect } from 'next/navigation';
import { isAuthed } from '@/lib/auth';
import { logout } from '@/lib/auth';
import { db, ensureSchema, type ProjectRow } from '@/lib/db';
import Sidebar, { type ProjectLite } from './Sidebar';

async function doLogout() {
  'use server';
  await logout();
  redirect('/login');
}

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect('/login');
  await ensureSchema();

  const projR = await db().prepare('SELECT * FROM projects ORDER BY created_at ASC, id ASC').all<ProjectRow>();
  const formR = await db()
    .prepare(
      `SELECT f.id, f.name, f.active, f.project_id,
        (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id AND s.spam = 0) AS total
       FROM forms f ORDER BY f.created_at ASC`
    )
    .all<{ id: string; name: string; active: number; project_id: string | null; total: number }>();

  const tree: ProjectLite[] = (projR.results ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    forms: [],
  }));
  const byId = new Map(tree.map((p) => [p.id, p]));

  for (const f of formR.results ?? []) {
    const pid = f.project_id && byId.has(f.project_id) ? f.project_id : 'general';
    let g = byId.get(pid);
    if (!g) {
      g = { id: pid, name: 'General', forms: [] };
      byId.set(pid, g);
      tree.push(g);
    }
    g.forms.push({ id: f.id, name: f.name, active: f.active, total: f.total });
  }

  return (
    <div>
      <header className="admin-top">
        <div className="admin-top-inner">
          <a href="/admin" className="hero-logo" style={{ fontSize: 17 }}>
            <span className="dot" /> InkForm
          </a>
          <nav className="links">
            <a href="/">Site</a>
            <a href="https://github.com/Liteink/inkform">Docs</a>
            <form action={doLogout} style={{ display: 'inline' }}>
              <button className="link-plain" type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <div className="admin-shell">
        <Sidebar projects={tree} />
        <main className="admin-body">{children}</main>
      </div>
    </div>
  );
}
