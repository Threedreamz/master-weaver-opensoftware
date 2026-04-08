/**
 * Webhook notification system for OpenDesktop.
 * Reads target URLs from OPENDESKTOP_WEBHOOK_URLS env var (comma-separated).
 * POSTs JSON payloads on Vorgang status changes. Non-blocking — errors are logged, not thrown.
 */

interface WebhookPayload {
  event: string;
  vorgangId: string;
  globalId: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

function getWebhookUrls(): string[] {
  const raw = process.env.OPENDESKTOP_WEBHOOK_URLS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

export async function notifyVorgangStatusChange(
  vorgangId: string,
  oldStatus: string,
  newStatus: string,
  vorgang: { globalId: string; title: string }
): Promise<void> {
  const urls = getWebhookUrls();
  if (urls.length === 0) return;

  const payload: WebhookPayload = {
    event: "vorgang.status_changed",
    vorgangId,
    globalId: vorgang.globalId,
    title: vorgang.title,
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) {
          console.warn(`[webhook] ${url} responded ${response.status}`);
        }
      } catch (err) {
        console.warn(`[webhook] Failed to notify ${url}:`, err);
      }
    })
  );
}
