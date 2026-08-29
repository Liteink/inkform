export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Select a form from the sidebar, or create a project to group your forms.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body home-guide">
          <h2 style={{ fontSize: 17, marginTop: 0 }}>How InkForm works</h2>
          <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-2)' }}>
            <li><strong style={{ color: 'var(--ink)' }}>Add a project</strong> in the sidebar — one per site or client.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Create a form</strong> inside a project and copy its endpoint.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Point any HTML form</strong> at the endpoint. No JavaScript required.</li>
            <li>Submissions arrive in real time, with spam filtering and CSV export.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
