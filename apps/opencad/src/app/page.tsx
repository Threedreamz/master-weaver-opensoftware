export default function RootPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <h1>OpenCAD</h1>
      <p>Parametric CAD + CAM + Assemblies. Milestone 1 (CAD core) coming online.</p>
      <ul>
        <li><a href="/api/health">/api/health</a></li>
        <li><a href="/api/appstore/manifest">/api/appstore/manifest</a></li>
      </ul>
    </main>
  );
}
