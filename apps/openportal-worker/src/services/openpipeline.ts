import {
  openPipelineWebhookPayloadSchema,
  type OpenPipelineWebhookPayload,
} from "@opensoftware/openportal-core";

export async function sendOpenPipelineWebhook(
  payload: OpenPipelineWebhookPayload,
  opts: {
    url: string;
    secret: string;
    fetchImpl?: typeof fetch;
  },
): Promise<{ ok: true; response: unknown }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const validated = openPipelineWebhookPayloadSchema.parse(payload);

  const res = await fetchImpl(opts.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-secret": opts.secret,
    },
    body: JSON.stringify(validated),
  });

  if (!res.ok) {
    throw new Error(
      `OpenPipeline webhook failed ${res.status}: ${await res.text()}`,
    );
  }

  return { ok: true, response: await res.json().catch(() => null) };
}
