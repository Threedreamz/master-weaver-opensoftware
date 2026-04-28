import type { GenerationInput, SubmitResult, PollResult } from "./types";

/**
 * Shared Replicate-backed driver for OSS image-to-3d models (TripoSR, TRELLIS,
 * Hunyuan3D-2). Replicate's `predictions` API is the same for all three; only
 * the model version SHA, the input field name, and the output extraction shape
 * differ. Each model-specific adapter passes its config in.
 *
 * Replicate API: https://replicate.com/docs/reference/http
 */

const API_BASE = "https://api.replicate.com/v1";

interface ReplicatePredictionResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
}

export interface Replicate3DConfig {
  /** Replicate model version SHA. */
  version: string;
  /**
   * Field name on Replicate's `input` payload that takes the image URL.
   * TripoSR: "image_path", Hunyuan3D: "image", TRELLIS: "images" (array).
   */
  imageField: string;
  /** If true, wrap the URL in a single-element array (TRELLIS). */
  imageAsArray?: boolean;
  /** Extra input fields to pass through unchanged. */
  extraInput?: Record<string, unknown>;
  /**
   * Extract the final GLB URL from Replicate's `output`. Returns null if not
   * found (then poll() reports failed). TripoSR returns a bare string; Trellis
   * uses output.model_file; Hunyuan3D uses output.mesh.
   */
  extractGlbUrl: (output: unknown) => string | null;
}

function authHeader(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Replicate: missing REPLICATE_API_TOKEN");
  return `Token ${token}`;
}

function imageUrlFromInput(input: GenerationInput): string {
  const v = input.inputPayload["imageUrl"];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error("inputPayload.imageUrl is required for image-to-3d");
  }
  return v;
}

export async function submitReplicate3D(
  input: GenerationInput,
  cfg: Replicate3DConfig,
): Promise<SubmitResult> {
  if (input.inputType !== "image") {
    throw new Error(`Replicate-OSS providers only accept image input (got ${input.inputType})`);
  }
  const imageUrl = imageUrlFromInput(input);
  const inputBody: Record<string, unknown> = {
    [cfg.imageField]: cfg.imageAsArray ? [imageUrl] : imageUrl,
    ...(cfg.extraInput ?? {}),
  };

  const resp = await fetch(`${API_BASE}/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ version: cfg.version, input: inputBody }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Replicate submit failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
  }
  const data = (await resp.json()) as ReplicatePredictionResponse;
  if (!data.id) {
    throw new Error("Replicate submit: missing prediction id");
  }
  return { providerJobId: data.id };
}

export async function pollReplicate3D(
  providerJobId: string,
  cfg: Replicate3DConfig,
): Promise<PollResult> {
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

  const glbUrl = cfg.extractGlbUrl(data.output);
  if (!glbUrl) {
    return {
      status: "failed",
      errorMessage: "Replicate succeeded but no GLB URL in output",
    };
  }
  return { status: "succeeded", glbUrl };
}
