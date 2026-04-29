"use client";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html><body style={{ padding: 32, fontFamily: "system-ui" }}>
      <h2>Application error</h2>
      <p style={{ color: "#666", fontSize: 14 }}>{error.message}</p>
      <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px" }}>Try again</button>
    </body></html>
  );
}
