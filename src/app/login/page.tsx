import { redirect } from 'next/navigation';
import { login, adminPasswordConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function doLogin(formData: FormData) {
  'use server';
  const password = String(formData.get('password') || '');
  const ok = await login(password);
  if (ok) redirect('/admin');
  redirect('/login?e=1');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const configured = adminPasswordConfigured();

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="hero-logo"><span className="dot" /> InkForm</span>
        <h1>Sign in</h1>
        <p className="hint">Admin dashboard — owner access only.</p>
        {!configured && (
          <div className="notice-box">
            ADMIN_PASSWORD is not configured. Set it via <code>wrangler secret put ADMIN_PASSWORD</code> and redeploy.
          </div>
        )}
        {e && <div className="error-box">Wrong password.</div>}
        <form action={doLogin}>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required autoFocus autoComplete="current-password" />
          </div>
          <br />
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
