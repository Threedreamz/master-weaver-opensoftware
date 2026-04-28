import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

/**
 * Tripo3D — text-to-3d (text_to_model) and image-to-3d (image_to_model).
 *
 * Single endpoint POST /v2/openapi/task with `type` discriminator. Image input
 * accepts a public URL via `file.url` so no upload step is needed when the
 * caller provides an R2 (or other publicly fetchable) URL.
 *
 * Docs: https://platform.tripo3d.ai/docs
 */

const API_BASE = "https://api.tripo3d.ai/v2/openapi";
const DEFAULT_MODEL_VERSION = "v2.5-20250123";

interface TripoSubmitResponse {
  code?: number;
  message?: string;
  data?: { task_id?: string };
}

interface TripoPollResponse {
  code?: number;
  message?: string;
  data?: {
    task_id?: string;
    status?: string;
    progress?: number;
    output?: { model?: string; pbr_model?: string; rendered_image?: string };
    error_code?: number;
    error_msg?: string;
  };
}

function authHeader(): string {
  const token = process.env.TRIPO_API_KEY;
  if (!token) throw new Error("Tripo: missing TRIPO_API_KEY");
  return `Bearer ${token}`;
}

function normaliseString(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Tripo: inputPayload.${key} is required`);
}

function modelVersion(p: Record<string, unknown>): string {
  const v = p["modelVersion"];
  if (typeof v === "string" && v.length > 0) return v;
  return process.env.TRIPO_DEFAULT_MODEL_VERSION || DEFAULT_MODEL_VERSION;
}

function imageType(url: string): "jpeg" | "png" | "webp" {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  return "jpeg";
}

export const tripoProvider: ProviderAdapter = {
  id: "tripo",
  displayName: "Tripo",
  isEnabled(): boolean {
    return !!process.env.TRIPO_API_KEY;
  },
  async submit(input: GenerationInput): Promise<SubmitResult> {
    let body: Record<string, unknown>;
    if (input.inputType === "image") {
      const imageUrl = normaliseString(input.inputPayload, "imageUrl");
      body = {
        type: "image_to_model",
        file: { type: imageType(imageUrl), url: imageUrl },
        model_version: modelVersion(input.inputPayload),
      };
    } else {
      const prompt = normaliseString(input.inputPayload, "prompt");
      body = {
        type: "text_to_model",
        prompt,
        model_version: modelVersion(input.inputPayload),
      };
    }

    const resp = await fetch(`${API_BASE}/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Tripo submit failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    const data = (await resp.json()) as TripoSubmitResponse;
    const taskId = data.data?.task_id;
    if (!taskId) {
      throw new Error(
        `Tripo submit: missing task_id (code=${data.code} message=${data.message ?? ""})`,
      );
    }
    return { providerJobId: taskId };
  },
  async poll(providerJobId: string): Promise<PollResult> {
    const resp = await fetch(`${API_BASE}/task/${providerJobId}`, {
      headers: { Authorization: authHeader() },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Tripo poll failed (HTTP ${resp.status}): ${text.slice(0, 300)}`,
      };
    }
    const body = (await resp.json()) as TripoPollResponse;
    const d = body.data;
    if (!d) {
      return { status: "failed", errorMessage: `Tripo poll: empty data (code=${body.code})` };
    }

    const status = (d.status ?? "").toLowerCase();
    if (status === "success") {
      const glbUrl = d.output?.pbr_model || d.output?.model;
      if (!glbUrl) {
        return { status: "failed", errorMessage: "Tripo succeeded but returned no GLB URL" };
      }
      return { status: "succeeded", glbUrl };
    }
    if (status === "failed" || status === "cancelled" || status === "unknown") {
      const errMsg =
        d.error_msg ||
        (d.error_code ? `tripo error_code=${d.error_code}` : `tripo status=${d.status}`);
      return { status: "failed", errorMessage: errMsg };
    }
    return { status: "running" };
  },
};
