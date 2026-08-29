const SITE = 'https://inkform.2849288402.workers.dev'; // replaced after deploy

export default function Home() {
  return (
    <div className="wrap">
      <header className="hero">
        <span className="hero-logo"><span className="dot" /> InkForm</span>
        <h1>
          Your HTML form, <span className="accent">a real backend</span>.
        </h1>
        <p className="sub">
          Open-source form backend that runs entirely on Cloudflare&apos;s free tier.
          No server, no database admin, no monthly bill. Deploy once, point any form at it.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="https://github.com/Liteink/inkform#deploy-to-cloudflare">
            Deploy to Cloudflare
          </a>
          <a className="btn btn-soft" href="https://github.com/Liteink/inkform">
            GitHub
          </a>
        </div>
      </header>

      <section className="section">
        <h2>It works like this</h2>
        <p className="lead">Plain HTML. No JavaScript required.</p>
        <pre className="code">
{`<span class="tag">&lt;form</span>
  <span class="attr">action</span>="<span class="tag">${SITE}/f/your-form-id</span>"
  <span class="attr">method</span>="POST"
<span class="tag">&gt;</span>
  <span class="tag">&lt;input</span> <span class="attr">type</span>="text" <span class="attr">name</span>="email" <span class="attr">required</span> <span class="tag">/&gt;</span>
  <span class="tag">&lt;textarea</span> <span class="attr">name</span>="message"<span class="tag">&gt;&lt;/textarea&gt;</span>

  <span class="c">&lt;!-- honeypot: bots fill it, humans never see it --&gt;</span>
  <span class="tag">&lt;input</span> <span class="attr">type</span>="text" <span class="attr">name</span>="_gotcha" <span class="attr">style</span>="display:none" <span class="tag">/&gt;</span>

  <span class="tag">&lt;button&gt;</span>Send<span class="tag">&lt;/button&gt;</span>
<span class="tag">&lt;/form&gt;</span>`}
        </pre>
      </section>

      <section className="section">
        <h2>Special fields</h2>
        <p className="lead">Fields starting with an underscore are control fields — they are never stored.</p>
        <table className="spec">
          <thead>
            <tr><th>Field</th><th>What it does</th></tr>
          </thead>
          <tbody>
            <tr><td><code>_gotcha</code></td><td>Honeypot. If a bot fills it, the submission is silently dropped with a fake success.</td></tr>
            <tr><td><code>_next</code></td><td>Redirect URL after submit (full-page form posts). Overrides the form&apos;s default redirect.</td></tr>
            <tr><td><code>cf-turnstile-response</code></td><td>Cloudflare Turnstile token, validated when Turnstile is enabled for the form.</td></tr>
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>AJAX works too</h2>
        <p className="lead">Send <code>Accept: application/json</code> and you get JSON back instead of a redirect.</p>
        <pre className="code">
{`<span class="tag">await</span> fetch(<span class="attr">'${SITE}/f/your-form-id'</span>, {
  <span class="attr">method</span>: 'POST',
  <span class="attr">headers</span>: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  <span class="attr">body</span>: JSON.stringify({ email: 'hi@example.com', message: 'hello' })
});
<span class="c">// → { "ok": true }</span>`}
        </pre>
      </section>

      <footer className="footer">
        InkForm · MIT · part of the <a href="https://liteink.co">LiteInk</a> family
      </footer>
    </div>
  );
}
