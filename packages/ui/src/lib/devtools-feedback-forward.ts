// Fire-and-forget forwarder that mirrors a feedback entry into the centralized
// devtools-manager inbox. Used by opensoftware admin panels as the sole storage
// target (no local table — devtools-manager IS the source of truth for these).
//
// Required env vars (set by wire-infra-to-bubbles.cjs):
//   DEVTOOLS_API_URL         — e.g. http://devtools-control-plane.railway.internal:4050
//   DEVTOOLS_SERVICE_TOKEN   — shared bearer token

export interface ForwardFeedbackArgs {
  bubble: string;
  app: string;
  category?: string | null;
  title?: string | null;
  body: string;
  url?: string | null;
  screenshotUrl?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  originId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function forwardFeedbackToDevtools(args: ForwardFeedbackArgs): void {
  const url = process.env.DEVTOOLS_API_URL;
  const token = process.env.DEVTOOLS_SERVICE_TOKEN;
  if (!url || !token) return;

  const endpoint = `${url.replace(/\/+$/, "")}/api/feedback/ingest`;
  void (async () => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        console.warn(
          `[devtools-feedback-forward] ${args.bubble}/${args.app} HTTP ${res.status}`,
        );
      }
    } catch (err) {
      console.warn(
        "[devtools-feedback-forward] forward failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
}
