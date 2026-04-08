export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>OpenSoftware API Gateway</h1>
      <p>Unified entry point for external apps.</p>
      <p>
        API base: <code>/api/v1/[service]/[...path]</code>
      </p>
      <p>
        Health: <a href="/api/health"><code>/api/health</code></a>
      </p>
      <p>
        Services: <a href="/api/v1/services"><code>/api/v1/services</code></a>
      </p>
    </main>
  );
}
