import { redirect } from 'next/navigation';
import { isAuthed } from '@/lib/auth';
import { logout } from '@/lib/auth';

async function doLogout() {
  'use server';
  await logout();
  redirect('/login');
}

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect('/login');
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
      <main className="admin-body">{children}</main>
    </div>
  );
}
