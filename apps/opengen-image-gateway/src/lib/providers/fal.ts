import type {
  ImageInput,
  PollResult,
  ProviderAdapter,
  SubmitResult,
} from "./types";

/**
 * Fal — fast hosted text-to-image inference.
 *
 * Uses the `queue.fal.run` async API: POST a request, receive a request_id,
 * poll status until COMPLETED, then fetch the response. Default model is
 * `fal-ai/flux/schnell` (4-step Flux variant — sub-second, ~$0.003/image).
 * Can be overridden per-request via inputPayload.model or globally via
 * `FAL_DEFAULT_MODEL`.
 *
 * Docs: https://fal.ai/models/fal-ai/flux/schnell/api
 */

const QUEUE_BASE = "https://queue.fal.run";
const DEFAULT_MODEL = process.env.FAL_DEFAULT_MODEL || "fal-ai/flux/schnell";

interface FalQueueSubmitResponse {
  request_id: string;
  status?: string;
  response_url?: string;
  status_url?: string;
}

interface FalQueueStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: Array<{ message?: string }>;
  response_url?: string;
}

interface FalImageResult {
  images?: Array<{
    url?: string;
    width?: number;
    height?: number;
    content_type?: string;
  }>;
}

function authHeader(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("Fal: missing FAL_KEY");
  return `Key ${key}`;
}

function modelFromPayload(p: Record<string, unknown>): string {
  const v = p["model"];
  return typeof v === "string" && v.length > 0 ? v : DEFAULT_MODEL;
}

function normalisePrompt(p: Record<string, unknown>): string {
  const v = p["prompt"];
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error("Fal: inputPayload.prompt is required");
}

export const falProvider: ProviderAdapter = {
  id: "fal",
  displayName: "Fal (Flux Schnell)",
  isEnabled(): boolean {
    return !!process.env.FAL_KEY;
  },
  async submit(input: ImageInput): Promise<SubmitResult> {
    const model = modelFromPayload(input.inputPayload);
    const prompt = normalisePrompt(input.inputPayload);

    const body: Record<string, unknown> = {
      prompt,
      image_size: input.inputPayload["image_size"] ?? "square_hd",
      num_inference_steps: input.inputPayload["num_inference_steps"] ?? 4,
      num_images: 1,
      enable_safety_checker: true,
    };
    // img2img mode: caller passes inputType="image" + image_url in payload.
    if (input.inputType === "image" && input.inputPayload["image_url"]) {
      body["image_url"] = input.inputPayload["image_url"];
    }

    const url = `${QUEUE_BASE}/${model}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Fal submit failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    const data = (await resp.json()) as FalQueueSubmitResponse;
    if (!data.request_id) {
      throw new Error("Fal submit: missing request_id in response");
    }
    // Pack model into the providerJobId so poll() can reconstruct the URL.
    return { providerJobId: `${model}::${data.request_id}` };
  },
  async poll(providerJobId: string): Promise<PollResult> {
    const sep = providerJobId.indexOf("::");
    if (sep === -1) {
      return { status: "failed", errorMessage: `malformed Fal job id: ${providerJobId}` };
    }
    const model = providerJobId.slice(0, sep);
    const requestId = providerJobId.slice(sep + 2);

    const statusUrl = `${QUEUE_BASE}/${model}/requests/${requestId}/status`;
    const statusResp = await fetch(statusUrl, {
      headers: { Authorization: authHeader() },
    });
    if (!statusResp.ok) {
      const text = await statusResp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Fal status check failed (HTTP ${statusResp.status}): ${text.slice(0, 300)}`,
      };
    }
    const status = (await statusResp.json()) as FalQueueStatusResponse;

    if (status.status === "FAILED") {
      const last = status.logs?.[status.logs.length - 1]?.message;
      return { status: "failed", errorMessage: last ?? "Fal reported FAILED" };
    }
    if (status.status !== "COMPLETED") {
      return { status: "running" };
    }

    const respUrl = status.response_url ?? `${QUEUE_BASE}/${model}/requests/${requestId}`;
    const respResp = await fetch(respUrl, {
      headers: { Authorization: authHeader() },
    });
    if (!respResp.ok) {
      const text = await respResp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Fal response fetch failed (HTTP ${respResp.status}): ${text.slice(0, 300)}`,
      };
    }
    const result = (await respResp.json()) as FalImageResult;
    const first = result.images?.[0];
    if (!first?.url) {
      return { status: "failed", errorMessage: "Fal completed but returned no image URL" };
    }
    return {
      status: "succeeded",
      imageUrl: first.url,
      width: first.width,
      height: first.height,
    };
  },
};
