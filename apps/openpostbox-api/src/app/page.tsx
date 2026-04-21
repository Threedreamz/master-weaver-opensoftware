export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>OpenPostbox API</h1>
      <p>
        Virtual mailbox service. This app is a headless API — UI is rendered by
        the host bubble (3Dreamz Hub) via the AppStore manifest.
      </p>
      <ul>
        <li>
          <a href="/api/health">/api/health</a>
        </li>
        <li>
          <a href="/api/appstore/manifest">/api/appstore/manifest</a>
        </li>
      </ul>
    </main>
  );
}
