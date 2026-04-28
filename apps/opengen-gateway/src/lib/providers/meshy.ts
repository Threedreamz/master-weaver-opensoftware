import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

/**
 * Meshy — text-to-3d (v2) and image-to-3d (v1).
 *
 * Submits in `mode:"preview"` only — preview returns a usable GLB once status
 * flips to SUCCEEDED. Refine is a separate paid pass and not chained here.
 *
 * Docs: https://docs.meshy.ai/api/text-to-3d, https://docs.meshy.ai/api/image-to-3d
 */

const API_BASE = "https://api.meshy.ai/openapi";

interface MeshyTaskResponse {
  id?: string;
  status?: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELED";
  progress?: number;
  model_urls?: { glb?: string; fbx?: string; obj?: string; usdz?: string };
  task_error?: { message?: string };
}

interface MeshySubmitResponse {
  result?: string;
}

function authHeader(): string {
  const token = process.env.MESHY_API_KEY;
  if (!token) throw new Error("Meshy: missing MESHY_API_KEY");
  return `Bearer ${token}`;
}

function normaliseString(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Meshy: inputPayload.${key} is required`);
}

function endpointForJob(providerJobId: string): string {
  // Image-to-3d job ids and text-to-3d job ids are both UUIDv7 strings; we
  // disambiguate by storing a `mode` prefix on submit. To keep the poll
  // signature stable we encode it as `<v>:<id>` where v is "v1" or "v2".
  if (providerJobId.startsWith("v1:")) {
    return `${API_BASE}/v1/image-to-3d/${providerJobId.slice(3)}`;
  }
  if (providerJobId.startsWith("v2:")) {
    return `${API_BASE}/v2/text-to-3d/${providerJobId.slice(3)}`;
  }
  // Legacy unprefixed: assume v2 (text-to-3d) for backward compatibility.
  return `${API_BASE}/v2/text-to-3d/${providerJobId}`;
}

export const meshyProvider: ProviderAdapter = {
  id: "meshy",
  displayName: "Meshy",
  isEnabled(): boolean {
    return !!process.env.MESHY_API_KEY;
  },
  async submit(input: GenerationInput): Promise<SubmitResult> {
    let url: string;
    let body: Record<string, unknown>;
    let prefix: "v1:" | "v2:";

    if (input.inputType === "image") {
      const imageUrl = normaliseString(input.inputPayload, "imageUrl");
      url = `${API_BASE}/v1/image-to-3d`;
      body = {
        image_url: imageUrl,
        ai_model: "latest",
        should_texture: true,
        target_formats: ["glb"],
      };
      prefix = "v1:";
    } else {
      const prompt = normaliseString(input.inputPayload, "prompt");
      url = `${API_BASE}/v2/text-to-3d`;
      body = {
        mode: "preview",
        prompt,
        ai_model: "meshy-5",
        target_formats: ["glb"],
      };
      prefix = "v2:";
    }

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
      throw new Error(`Meshy submit failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    const data = (await resp.json()) as MeshySubmitResponse;
    if (!data.result) {
      throw new Error("Meshy submit: missing result id in response");
    }
    return { providerJobId: `${prefix}${data.result}` };
  },
  async poll(providerJobId: string): Promise<PollResult> {
    const url = endpointForJob(providerJobId);
    const resp = await fetch(url, {
      headers: { Authorization: authHeader() },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Meshy poll failed (HTTP ${resp.status}): ${text.slice(0, 300)}`,
      };
    }
    const data = (await resp.json()) as MeshyTaskResponse;

    if (data.status === "FAILED" || data.status === "CANCELED") {
      return {
        status: "failed",
        errorMessage: data.task_error?.message || `meshy task ${data.status?.toLowerCase()}`,
      };
    }
    if (data.status !== "SUCCEEDED") {
      return { status: "running" };
    }

    const glbUrl = data.model_urls?.glb;
    if (!glbUrl) {
      return {
        status: "failed",
        errorMessage: "Meshy succeeded but returned no GLB URL",
      };
    }
    return { status: "succeeded", glbUrl };
  },
};
