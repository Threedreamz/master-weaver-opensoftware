import type {
  ImageInput,
  PollResult,
  ProviderAdapter,
  SubmitResult,
} from "./types";

/**
 * Replicate — broader catalog of text-to-image + img2img models.
 *
 * Uses the `predictions` API. Default model version is set via
 * `REPLICATE_DEFAULT_MODEL_VERSION` env var (Replicate models are pinned by
 * a SHA, e.g. "black-forest-labs/flux-schnell:..."). Can be overridden per
 * request via inputPayload.modelVersion.
 *
 * Docs: https://replicate.com/docs/reference/http
 */

const API_BASE = "https://api.replicate.com/v1";

interface ReplicatePredictionResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
  urls?: { get?: string; cancel?: string };
}

function authHeader(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Replicate: missing REPLICATE_API_TOKEN");
  return `Token ${token}`;
}

function modelVersionFromPayload(p: Record<string, unknown>): string {
  const v = p["modelVersion"];
  if (typeof v === "string" && v.length > 0) return v;
  const env = process.env.REPLICATE_DEFAULT_MODEL_VERSION;
  if (env) return env;
  throw new Error(
    "Replicate: no model version — set REPLICATE_DEFAULT_MODEL_VERSION or pass inputPayload.modelVersion",
  );
}

function normalisePrompt(p: Record<string, unknown>): string {
  const v = p["prompt"];
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error("Replicate: inputPayload.prompt is required");
}

function extractImageUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in (first as Record<string, unknown>)) {
      const u = (first as { url?: unknown }).url;
      return typeof u === "string" ? u : null;
    }
  }
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (typeof obj["url"] === "string") return obj["url"] as string;
    if (Array.isArray(obj["images"]) && typeof obj["images"][0] === "string") {
      return obj["images"][0] as string;
    }
  }
  return null;
}

export const replicateProvider: ProviderAdapter = {
  id: "replicate",
  displayName: "Replicate",
  isEnabled(): boolean {
    return !!process.env.REPLICATE_API_TOKEN;
  },
  async submit(input: ImageInput): Promise<SubmitResult> {
    const version = modelVersionFromPayload(input.inputPayload);
    const prompt = normalisePrompt(input.inputPayload);

    const inputBody: Record<string, unknown> = {
      prompt,
      ...(input.inputPayload["aspect_ratio"]
        ? { aspect_ratio: input.inputPayload["aspect_ratio"] }
        : {}),
      ...(input.inputPayload["num_inference_steps"]
        ? { num_inference_steps: input.inputPayload["num_inference_steps"] }
        : {}),
    };
    if (input.inputType === "image" && input.inputPayload["image_url"]) {
      inputBody["image"] = input.inputPayload["image_url"];
    }

    const resp = await fetch(`${API_BASE}/predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({ version, input: inputBody }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Replicate submit failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    const data = (await resp.json()) as ReplicatePredictionResponse;
    if (!data.id) {
      throw new Error("Replicate submit: missing prediction id in response");
    }
    return { providerJobId: data.id };
  },
  async poll(providerJobId: string): Promise<PollResult> {
    const resp = await fetch(`${API_BASE}/predictions/${providerJobId}`, {
      headers: { Authorization: authHeader() },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Replicate poll failed (HTTP ${resp.status}): ${text.slice(0, 300)}`,
      };
    }
    const data = (await resp.json()) as ReplicatePredictionResponse;

    if (data.status === "failed" || data.status === "canceled") {
      return { status: "failed", errorMessage: data.error || `prediction ${data.status}` };
    }
    if (data.status !== "succeeded") {
      return { status: "running" };
    }

    const url = extractImageUrl(data.output);
    if (!url) {
      return {
        status: "failed",
        errorMessage: "Replicate succeeded but returned no parseable image URL",
      };
    }
    return { status: "succeeded", imageUrl: url };
  },
};
