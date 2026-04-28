import { listEnabledProviders } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const enabled = listEnabledProviders();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 720 }}>
      <h1 style={{ marginTop: 0 }}>OpenGen Image Gateway</h1>
      <p>
        AI text-to-image API. POST to <code>/api/generate</code> to submit a job, then GET{" "}
        <code>/api/jobs/&lt;id&gt;</code> to poll status.
      </p>
      <h2>Enabled providers</h2>
      {enabled.length === 0 ? (
        <p>
          <em>No providers enabled — set FAL_KEY or REPLICATE_API_TOKEN in environment.</em>
        </p>
      ) : (
        <ul>
          {enabled.map((p) => (
            <li key={p.id}>
              <code>{p.id}</code> — {p.displayName}
            </li>
          ))}
        </ul>
      )}
      <p>
        See <a href="/api/health">/api/health</a> and{" "}
        <a href="/api/appstore/manifest">/api/appstore/manifest</a>.
      </p>
    </main>
  );
}
